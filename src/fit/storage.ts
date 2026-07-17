/**
 * История треков в IndexedDB.
 *
 * id всегда = name:size (historyKey). Раньше использовался SHA-256 — после
 * смены алгоритма копились дубликаты одного файла; listHistory схлопывает.
 */

export interface SavedTrackMeta {
  /** Ключ: имя + размер — стабилен между сессиями, дедуплицирует повторы. */
  id: string;
  name: string;
  size: number;
  /** Когда добавлен в историю (unix ms). */
  savedAt: number;
  sport?: string;
  /** Старт тренировки (unix ms). */
  startTime?: number;
  /** Дистанция, м. */
  distance: number;
  /** Время в движении, с. */
  moving: number;
}

const DB_NAME = 'fit-stats';
const DB_VERSION = 1;
const META = 'meta';
const FILES = 'files';

const openDb = (): Promise<IDBDatabase> =>
  new Promise((resolve, reject) => {
    const req = indexedDB.open(DB_NAME, DB_VERSION);
    req.onupgradeneeded = () => {
      const db = req.result;
      if (!db.objectStoreNames.contains(META)) db.createObjectStore(META, { keyPath: 'id' });
      if (!db.objectStoreNames.contains(FILES)) db.createObjectStore(FILES);
    };
    req.onsuccess = () => resolve(req.result);
    req.onerror = () => reject(req.error);
  });

const tx = <T>(
  db: IDBDatabase,
  stores: string[],
  mode: IDBTransactionMode,
  run: (t: IDBTransaction) => IDBRequest<T> | void
): Promise<T> =>
  new Promise((resolve, reject) => {
    const t = db.transaction(stores, mode);
    let result: T;
    const req = run(t);
    if (req) req.onsuccess = () => (result = req.result);
    t.oncomplete = () => resolve(result);
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });

/** Стабильный ключ: имя файла + размер в байтах. */
export const historyKey = (name: string, size: number): string => `${name}:${size}`;

/** Схлопывает дубликаты (одинаковые name+size) — оставляем самую свежую. */
export const dedupeHistoryMetas = (list: SavedTrackMeta[]): SavedTrackMeta[] => {
  const byKey = new Map<string, SavedTrackMeta>();
  for (const h of list) {
    const key = historyKey(h.name, h.size);
    const prev = byKey.get(key);
    if (!prev || (h.savedAt ?? 0) >= (prev.savedAt ?? 0)) {
      byKey.set(key, { ...h, id: key });
    }
  }
  return [...byKey.values()].sort(
    (a, b) => (b.startTime ?? b.savedAt) - (a.startTime ?? a.savedAt)
  );
};

export async function saveToHistory(meta: SavedTrackMeta, buffer: ArrayBuffer): Promise<void> {
  await saveManyToHistory([{ meta, buffer }]);
}

/** Пакетная запись в историю — один transaction. */
export async function saveManyToHistory(
  items: { meta: SavedTrackMeta; buffer: ArrayBuffer }[]
): Promise<void> {
  if (!items.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([META, FILES], 'readwrite');
    const metaStore = t.objectStore(META);
    const fileStore = t.objectStore(FILES);
    for (const { meta, buffer } of items) {
      const id = historyKey(meta.name, meta.size);
      metaStore.put({ ...meta, id });
      fileStore.put(buffer, id);
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  db.close();
}

export async function listHistory(): Promise<SavedTrackMeta[]> {
  const db = await openDb();
  const all =
    (await tx<SavedTrackMeta[]>(db, [META], 'readonly', (t) => t.objectStore(META).getAll())) ??
    [];
  const deduped = dedupeHistoryMetas(all);

  // Миграция: перенести blob на name:size и удалить старые id (хеши).
  const needsMigrate = all.some((h) => h.id !== historyKey(h.name, h.size));
  if (needsMigrate) {
    await new Promise<void>((resolve, reject) => {
      const t = db.transaction([META, FILES], 'readwrite');
      const metaStore = t.objectStore(META);
      const fileStore = t.objectStore(FILES);

      // 1) Для каждой канонической записи — взять blob из любого старого id.
      const byCanon = new Map<string, SavedTrackMeta[]>();
      for (const h of all) {
        const key = historyKey(h.name, h.size);
        const list = byCanon.get(key) ?? [];
        list.push(h);
        byCanon.set(key, list);
      }

      for (const [canon, variants] of byCanon) {
        const preferred =
          variants.find((v) => v.id === canon) ??
          [...variants].sort((a, b) => (b.savedAt ?? 0) - (a.savedAt ?? 0))[0];
        const meta = { ...preferred, id: canon };
        metaStore.put(meta);

        // Скопировать file: сначала с канона, иначе с preferred, иначе с любого.
        const tryIds = [canon, preferred.id, ...variants.map((v) => v.id)];
        const seen = new Set<string>();
        const copyFirst = (i: number) => {
          if (i >= tryIds.length) return;
          const id = tryIds[i];
          if (seen.has(id)) {
            copyFirst(i + 1);
            return;
          }
          seen.add(id);
          const g = fileStore.get(id);
          g.onsuccess = () => {
            const buf = g.result as ArrayBuffer | undefined;
            if (buf) fileStore.put(buf, canon);
            else copyFirst(i + 1);
          };
        };
        copyFirst(0);

        for (const v of variants) {
          if (v.id !== canon) {
            metaStore.delete(v.id);
            fileStore.delete(v.id);
          }
        }
      }

      t.oncomplete = () => resolve();
      t.onerror = () => reject(t.error);
      t.onabort = () => reject(t.error);
    }).catch(() => {});
  }

  db.close();
  return deduped;
}

export async function getHistoryFile(id: string): Promise<ArrayBuffer | undefined> {
  const db = await openDb();
  let buf = await tx<ArrayBuffer | undefined>(db, [FILES], 'readonly', (t) =>
    t.objectStore(FILES).get(id)
  );
  // Фолбэк: старые записи могли жить под хешем — ищем meta и name:size.
  if (!buf) {
    const all =
      (await tx<SavedTrackMeta[]>(db, [META], 'readonly', (t) => t.objectStore(META).getAll())) ??
      [];
    const hit = all.find((h) => h.id === id || historyKey(h.name, h.size) === id);
    if (hit) {
      const canon = historyKey(hit.name, hit.size);
      buf = await tx<ArrayBuffer | undefined>(db, [FILES], 'readonly', (t) =>
        t.objectStore(FILES).get(canon)
      );
      if (!buf && hit.id !== canon) {
        buf = await tx<ArrayBuffer | undefined>(db, [FILES], 'readonly', (t) =>
          t.objectStore(FILES).get(hit.id)
        );
      }
    }
  }
  db.close();
  return buf;
}

export async function removeFromHistory(id: string): Promise<void> {
  await removeManyFromHistory([id]);
}

export async function removeManyFromHistory(ids: string[]): Promise<void> {
  if (!ids.length) return;
  const db = await openDb();
  await new Promise<void>((resolve, reject) => {
    const t = db.transaction([META, FILES], 'readwrite');
    const metaStore = t.objectStore(META);
    const fileStore = t.objectStore(FILES);
    for (const id of ids) {
      metaStore.delete(id);
      fileStore.delete(id);
    }
    t.oncomplete = () => resolve();
    t.onerror = () => reject(t.error);
    t.onabort = () => reject(t.error);
  });
  db.close();
}

export async function clearHistory(): Promise<void> {
  const db = await openDb();
  await tx(db, [META, FILES], 'readwrite', (t) => {
    t.objectStore(META).clear();
    t.objectStore(FILES).clear();
  });
  db.close();
}
