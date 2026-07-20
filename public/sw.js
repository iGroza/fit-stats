/*
 * Service Worker: кэш тайлов карты в браузере (Cache Storage).
 * Стратегия cache-first — однажды загруженный тайл больше не качается по сети,
 * поэтому «чёрные квадраты» пропадают мгновенно при повторных просмотрах.
 * Кэшируются только тайлы карт (OpenTopoMap, OSM, Esri, CARTO); ответы CORS
 * сохраняются как есть, поэтому экспорт карты в PNG продолжает работать.
 */
const TILE_CACHE = 'fit-tiles-v1';
const MAX_TILES = 2000; // потолок числа тайлов в кэше
const TRIM_TO = 1700; // до скольких обрезаем при переполнении (FIFO)

/* Хосты тайловых серверов, ответы которых кэшируем. */
const TILE_HOST =
  /(^|\.)(tile\.opentopomap\.org|tile\.openstreetmap\.org|server\.arcgisonline\.com|basemaps\.cartocdn\.com)$/;

self.addEventListener('install', () => self.skipWaiting());

self.addEventListener('activate', (event) => {
  event.waitUntil(
    (async () => {
      // Чистим кэши прошлых версий.
      const names = await caches.keys();
      await Promise.all(
        names
          .filter((n) => n.startsWith('fit-tiles-') && n !== TILE_CACHE)
          .map((n) => caches.delete(n))
      );
      await self.clients.claim();
    })()
  );
});

let sinceTrim = 0;

/** FIFO-обрезка кэша: keys() отдаёт ключи в порядке добавления. */
async function trimCache(cache) {
  const keys = await cache.keys();
  if (keys.length <= MAX_TILES) return;
  const remove = keys.length - TRIM_TO;
  for (let i = 0; i < remove; i++) await cache.delete(keys[i]);
}

/** Сохранить успешный тайл в кэш и при переполнении подрезать. */
async function store(cache, req, resp) {
  await cache.put(req, resp);
  if (++sinceTrim >= 100) {
    sinceTrim = 0;
    await trimCache(cache);
  }
}

async function handleTile(event, req) {
  const cache = await caches.open(TILE_CACHE);
  const cached = await cache.match(req, { ignoreVary: true });
  if (cached) return cached; // главный выигрыш: мгновенно из кэша

  // Промах — идём в сеть. Успех кэшируем; ошибки/аборты НЕ маскируем
  // Response.error(): пробрасываем как при обычной загрузке, чтобы Leaflet
  // мог перезапросить тайл, а панорамирование не сыпало ложными ошибками.
  const fromNet = async () => {
    const resp = await fetch(req);
    if (resp && resp.status === 200 && resp.type !== 'opaque') {
      event.waitUntil(store(cache, req, resp.clone()));
    }
    return resp;
  };

  try {
    return await fromNet();
  } catch (err) {
    // Аборт при пане/зуме — тайл уже не нужен, повторять смысла нет.
    if (req.signal && req.signal.aborted) throw err;
    // Разовый транзиентный сбой сети — одна повторная попытка.
    return await fromNet();
  }
}

self.addEventListener('fetch', (event) => {
  const req = event.request;
  if (req.method !== 'GET') return;

  let url;
  try {
    url = new URL(req.url);
  } catch {
    return;
  }
  if (!TILE_HOST.test(url.hostname)) return;

  event.respondWith(handleTile(event, req));
});
