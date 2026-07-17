import type { TrackPoint } from './types';

/** Максимум точек, которые держим в памяти на один трек после парсинга. */
export const MAX_TRACK_POINTS = 1800;

/**
 * Равномерное прореживание точек после расчёта summary.
 * Для 300 GPX × ~3–30k точек иначе легко уйти в гигабайты RAM.
 * Первая и последняя точки всегда сохраняются.
 */
export const thinPoints = (points: TrackPoint[], maxPoints = MAX_TRACK_POINTS): TrackPoint[] => {
  if (points.length <= maxPoints) return points;
  const out: TrackPoint[] = new Array(maxPoints);
  const last = points.length - 1;
  const step = last / (maxPoints - 1);
  let prev = -1;
  for (let i = 0; i < maxPoints; i++) {
    let idx = i === maxPoints - 1 ? last : Math.round(i * step);
    if (idx <= prev) idx = prev + 1;
    if (idx > last) idx = last;
    out[i] = points[idx];
    prev = idx;
  }
  return out;
};

/**
 * Прореживание координат для Leaflet (ещё агрессивнее, чем storage).
 * Возвращает пары [lat, lng].
 */
export const thinLatLngs = (
  points: TrackPoint[],
  maxPoints = 400
): [number, number][] => {
  const withGps: [number, number][] = [];
  for (const p of points) {
    if (p.lat !== undefined && p.lng !== undefined) {
      withGps.push([p.lat, p.lng]);
    }
  }
  if (withGps.length <= maxPoints) return withGps;
  const out: [number, number][] = new Array(maxPoints);
  const last = withGps.length - 1;
  const step = last / (maxPoints - 1);
  for (let i = 0; i < maxPoints; i++) {
    const idx = i === maxPoints - 1 ? last : Math.round(i * step);
    out[i] = withGps[idx];
  }
  return out;
};
