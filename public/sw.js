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

  event.respondWith(
    (async () => {
      const cache = await caches.open(TILE_CACHE);
      const cached = await cache.match(req, { ignoreVary: true });
      if (cached) return cached;
      try {
        const resp = await fetch(req);
        // Кэшируем только успешные ответы (CORS/basic), не opaque.
        if (resp && resp.status === 200 && resp.type !== 'opaque') {
          await cache.put(req, resp.clone());
          if (++sinceTrim >= 100) {
            sinceTrim = 0;
            event.waitUntil(trimCache(cache));
          }
        }
        return resp;
      } catch (err) {
        // Сеть недоступна — отдаём кэш, если вдруг есть, иначе ошибку.
        return cached || Response.error();
      }
    })()
  );
});
