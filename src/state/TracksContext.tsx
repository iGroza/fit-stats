import {
  createContext,
  startTransition,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useRef,
  useState,
} from 'react';
import type { ReactNode } from 'react';
import { useToast } from '../components/common/Toast';
import { TRACK_COLORS } from '../config';
import { parseTrackBuffer } from '../fit/parseTrack';
import {
  clearHistory,
  dedupeHistoryMetas,
  getHistoryFile,
  historyKey,
  listHistory,
  removeFromHistory,
  removeManyFromHistory,
  saveManyToHistory,
} from '../fit/storage';
import type { SavedTrackMeta } from '../fit/storage';
import type { Track } from '../fit/types';
import { useI18n } from '../i18n';

export interface ParseError {
  fileName: string;
  /** Код из i18n (errors.*) либо сырое сообщение парсера. */
  message: string;
}

interface TracksState {
  tracks: Track[];
  /** Только видимые (участвуют в сводке/графиках). */
  visible: Track[];
  busyCount: number;
  errors: ParseError[];
  addFiles: (files: File[]) => void;
  toggleTrack: (id: string) => void;
  /** Показать или скрыть все треки разом (карта/сводка/графики). */
  setAllVisible: (visible: boolean) => void;
  removeTrack: (id: string) => void;
  clearTracks: () => void;
  /** История (IndexedDB): сохранённые ранее файлы. */
  history: SavedTrackMeta[];
  addFromHistory: (id: string) => void;
  /** Пустой массив = все. */
  addManyFromHistory: (ids: string[]) => void;
  deleteFromHistory: (id: string) => void;
  /** Пустой массив = все. */
  deleteManyFromHistory: (ids: string[]) => void;
}

const Ctx = createContext<TracksState | null>(null);

export const useTracks = (): TracksState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useTracks must be used within <TracksProvider>');
  return ctx;
};

/** Отдать кадр UI между тяжёлыми операциями. */
const yieldToMain = (): Promise<void> =>
  new Promise((resolve) => {
    if (typeof requestAnimationFrame === 'function') {
      requestAnimationFrame(() => resolve());
    } else {
      setTimeout(resolve, 0);
    }
  });

/** Сколько файлов читаем/парсим за один проход. */
const FILE_BATCH = 8;
/** Как часто сбрасываем parsed-треки в React state. */
const TRACK_FLUSH = 10;

export const TracksProvider = ({ children }: { children: ReactNode }) => {
  const { t } = useI18n();
  const toast = useToast();
  const [tracks, setTracks] = useState<Track[]>([]);
  const [busyCount, setBusyCount] = useState(0);
  const [errors, setErrors] = useState<ParseError[]>([]);
  const [colorCursor, setColorCursor] = useState(0);
  const [history, setHistory] = useState<SavedTrackMeta[]>([]);

  // Синхронное зеркало sourceId загруженных треков.
  const sourceIds = useRef(new Set<string>());
  const colorRef = useRef(0);
  useEffect(() => {
    sourceIds.current = new Set(tracks.map((tr) => tr.sourceId));
  }, [tracks]);
  useEffect(() => {
    colorRef.current = colorCursor;
  }, [colorCursor]);

  useEffect(() => {
    listHistory()
      .then((list) => setHistory(dedupeHistoryMetas(list)))
      .catch(() => {});
  }, []);

  const addBuffers = useCallback(
    async (
      items: { name: string; buffer: ArrayBuffer; knownId?: string }[],
      persist: boolean
    ): Promise<number> => {
      if (!items.length) return 0;
      setBusyCount((n) => n + items.length);
      setErrors([]);

      const trackBatch: Track[] = [];
      const historyBatch: { meta: SavedTrackMeta; buffer: ArrayBuffer }[] = [];
      let added = 0;
      let cursor = colorRef.current;

      const flushTracks = () => {
        if (!trackBatch.length) return;
        const chunk = trackBatch.splice(0, trackBatch.length);
        startTransition(() => {
          setTracks((prev) => [...prev, ...chunk]);
        });
      };

      for (let i = 0; i < items.length; i++) {
        const { name, buffer, knownId } = items[i];
        try {
          // Стабильный id = name:size — совпадает с историей, без SHA-дублей.
          const sourceId = knownId ?? historyKey(name, buffer.byteLength);
          if (sourceIds.current.has(sourceId)) {
            toast.error(t.toasts.duplicateTitle, t.toasts.duplicateMsg(name));
            continue;
          }
          const color = TRACK_COLORS[cursor % TRACK_COLORS.length];
          const track = await parseTrackBuffer(buffer, name, color, sourceId);
          sourceIds.current.add(sourceId);
          cursor++;
          trackBatch.push(track);
          added++;

          if (persist) {
            historyBatch.push({
              meta: {
                id: sourceId,
                name,
                size: buffer.byteLength,
                savedAt: Date.now(),
                sport: track.summary.sport,
                startTime: track.summary.startTime?.getTime(),
                distance: track.summary.distance,
                moving: track.summary.moving,
              },
              buffer,
            });
          }

          if (trackBatch.length >= TRACK_FLUSH) {
            flushTracks();
            await yieldToMain();
          }
        } catch (err) {
          const code = err instanceof Error ? err.message : String(err);
          const text =
            code === 'noRecords'
              ? t.errors.noRecords
              : code === 'historyMissing'
                ? t.errors.historyMissing
                : code;
          toast.error(name, text);
        } finally {
          setBusyCount((n) => n - 1);
        }
      }

      flushTracks();
      colorRef.current = cursor;
      setColorCursor(cursor);

      if (persist && historyBatch.length) {
        const metas = historyBatch.map((h) => ({
          ...h.meta,
          id: historyKey(h.meta.name, h.meta.size),
        }));
        try {
          for (let i = 0; i < historyBatch.length; i += 20) {
            await saveManyToHistory(historyBatch.slice(i, i + 20));
            await yieldToMain();
          }
          setHistory((prev) =>
            dedupeHistoryMetas([...metas, ...prev.filter((h) => !metas.some((m) => m.id === h.id))])
          );
        } catch {
          /* best effort */
        }
      }

      return added;
    },
    [t, toast]
  );

  const scrollToTracks = useCallback(() => {
    window.requestAnimationFrame(() => {
      window.setTimeout(() => {
        document.getElementById('tracks')?.scrollIntoView({ behavior: 'smooth', block: 'start' });
      }, 100);
    });
  }, []);

  const addFiles = useCallback(
    async (files: File[]) => {
      let total = 0;
      for (let i = 0; i < files.length; i += FILE_BATCH) {
        const chunk = files.slice(i, i + FILE_BATCH);
        const items = await Promise.all(
          chunk.map(async (f) => ({ name: f.name, buffer: await f.arrayBuffer() }))
        );
        total += await addBuffers(items, true);
        await yieldToMain();
      }
      if (total > 0) {
        toast.success(t.toasts.loadedTitle, t.toasts.loadedMsg(total));
        // Файлы сразу в анализе (visible=true) — показываем список, не историю.
        scrollToTracks();
      }
    },
    [addBuffers, t, toast, scrollToTracks]
  );

  const loadHistoryItems = useCallback(
    async (metas: SavedTrackMeta[]) => {
      let total = 0;
      for (let i = 0; i < metas.length; i += FILE_BATCH) {
        const chunk = metas.slice(i, i + FILE_BATCH);
        const items: { name: string; buffer: ArrayBuffer; knownId: string }[] = [];
        for (const meta of chunk) {
          const buffer = await getHistoryFile(meta.id).catch(() => undefined);
          if (buffer) items.push({ name: meta.name, buffer, knownId: meta.id });
          else toast.error(meta.name, t.errors.historyMissing);
        }
        if (items.length) total += await addBuffers(items, false);
        await yieldToMain();
      }
      if (total > 0) {
        toast.success(t.toasts.loadedTitle, t.toasts.loadedMsg(total));
        scrollToTracks();
      }
    },
    [addBuffers, t, toast, scrollToTracks]
  );

  const addFromHistory = useCallback(
    (id: string) => {
      const meta = history.find((h) => h.id === id);
      if (meta) loadHistoryItems([meta]);
    },
    [history, loadHistoryItems]
  );

  const addManyFromHistory = useCallback(
    (ids: string[]) => {
      const pool = ids.length ? history.filter((h) => ids.includes(h.id)) : history;
      loadHistoryItems(pool.filter((h) => !sourceIds.current.has(h.id)));
    },
    [history, loadHistoryItems]
  );

  const deleteFromHistory = useCallback(
    (id: string) => {
      setHistory((prev) => prev.filter((h) => h.id !== id));
      removeFromHistory(id)
        .then(() => toast.success(t.toasts.historyDeletedTitle))
        .catch(() => {});
    },
    [t, toast]
  );

  const deleteManyFromHistory = useCallback(
    (ids: string[]) => {
      if (!ids.length) {
        setHistory([]);
        clearHistory()
          .then(() => toast.success(t.toasts.historyClearedTitle))
          .catch(() => {});
        return;
      }
      setHistory((prev) => prev.filter((h) => !ids.includes(h.id)));
      removeManyFromHistory(ids)
        .then(() => toast.success(t.toasts.historyDeletedManyTitle(ids.length)))
        .catch(() => {});
    },
    [t, toast]
  );

  const toggleTrack = useCallback(
    (id: string) =>
      setTracks((prev) => prev.map((x) => (x.id === id ? { ...x, visible: !x.visible } : x))),
    []
  );

  const setAllVisible = useCallback(
    (visible: boolean) => {
      setTracks((prev) => {
        if (prev.every((tr) => tr.visible === visible)) return prev;
        return prev.map((tr) => (tr.visible === visible ? tr : { ...tr, visible }));
      });
      toast.success(visible ? t.toasts.showAllTitle : t.toasts.hideAllTitle);
    },
    [t, toast]
  );

  const removeTrack = useCallback(
    (id: string) => {
      setTracks((prev) => {
        const tr = prev.find((x) => x.id === id);
        if (tr) {
          sourceIds.current.delete(tr.sourceId);
          toast.success(t.toasts.trackRemovedTitle, tr.fileName);
        }
        return prev.filter((x) => x.id !== id);
      });
    },
    [t, toast]
  );

  const clearTracks = useCallback(() => {
    sourceIds.current.clear();
    setTracks([]);
    toast.success(t.toasts.listClearedTitle);
  }, [t, toast]);

  const visible = useMemo(() => tracks.filter((tr) => tr.visible), [tracks]);

  const value = useMemo(
    () => ({
      tracks,
      visible,
      busyCount,
      errors,
      addFiles,
      toggleTrack,
      setAllVisible,
      removeTrack,
      clearTracks,
      history,
      addFromHistory,
      addManyFromHistory,
      deleteFromHistory,
      deleteManyFromHistory,
    }),
    [
      tracks,
      visible,
      busyCount,
      errors,
      addFiles,
      toggleTrack,
      setAllVisible,
      removeTrack,
      clearTracks,
      history,
      addFromHistory,
      addManyFromHistory,
      deleteFromHistory,
      deleteManyFromHistory,
    ]
  );

  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
};
