/**
 * Парсер GPX (Apple Health / Apple Watch и любой стандартный GPX 1.1).
 *
 * Apple пишет: trkpt(lat, lon) + ele + time + extensions/speed (м/с),
 * без пульса и каденса. Дистанция считается по haversine, скорость — из
 * extensions либо по соседним точкам, время в движении — по дельтам
 * без длинных пауз.
 */
import { elevationGain } from './parseFit';
import type { Track, TrackPoint, TrackSummary } from './types';

const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const childText = (el: Element, tag: string): string | undefined => {
  // localName — GPX идёт с xmlns, querySelector по имени тега ненадёжен.
  for (const child of Array.from(el.children)) {
    if (child.localName === tag) return child.textContent ?? undefined;
  }
  return undefined;
};

const findSpeed = (pt: Element): number | undefined => {
  for (const ext of Array.from(pt.children)) {
    if (ext.localName !== 'extensions') continue;
    // <speed> лежит либо прямо в extensions (Apple), либо во вложенном
    // TrackPointExtension (Garmin Connect и др.).
    const walk = (el: Element): number | undefined => {
      for (const child of Array.from(el.children)) {
        if (child.localName === 'speed') {
          const v = parseFloat(child.textContent ?? '');
          return Number.isFinite(v) ? v : undefined;
        }
        const nested = walk(child);
        if (nested !== undefined) return nested;
      }
      return undefined;
    };
    return walk(ext);
  }
  return undefined;
};

const normalizePoints = (doc: Document): TrackPoint[] => {
  const points: TrackPoint[] = [];
  let dist = 0;
  let prev: TrackPoint | undefined;
  let start: number | undefined;

  for (const pt of Array.from(doc.getElementsByTagName('trkpt'))) {
    const lat = parseFloat(pt.getAttribute('lat') ?? '');
    const lng = parseFloat(pt.getAttribute('lon') ?? '');
    if (!Number.isFinite(lat) || !Number.isFinite(lng)) continue;

    const timeText = childText(pt, 'time');
    const time = timeText ? new Date(timeText) : undefined;
    if (!time || Number.isNaN(time.getTime())) continue;
    if (start === undefined) start = time.getTime();

    const eleText = childText(pt, 'ele');
    const ele = eleText !== undefined ? parseFloat(eleText) : undefined;
    const speedMs = findSpeed(pt);

    const p: TrackPoint = {
      time,
      t: Math.round((time.getTime() - start) / 1000),
      dist: 0,
      lat,
      lng,
      // Apple пишет ровно 0.000000, когда высоты нет — иначе смесь нулей и
      // реальных значений даёт фейковый набор высоты.
      alt: ele !== undefined && Number.isFinite(ele) && ele !== 0 ? ele : undefined,
      speed: speedMs !== undefined ? speedMs * 3.6 : undefined,
    };

    if (prev && prev.lat !== undefined && prev.lng !== undefined) {
      dist += haversine(prev.lat, prev.lng, lat, lng);
    }
    p.dist = dist;

    // Нет speed в extensions — считаем по соседним точкам.
    if (p.speed === undefined && prev) {
      const dt = p.t - prev.t;
      if (dt > 0 && dt <= 30) {
        p.speed = ((p.dist - prev.dist) / dt) * 3.6;
      }
    }
    p.pace = p.speed && p.speed > 1.8 ? Math.round((60 / p.speed) * 100) / 100 : undefined;

    points.push(p);
    prev = p;
  }

  return points;
};

const buildSummary = (points: TrackPoint[]): TrackSummary => {
  const last = points[points.length - 1];
  const first = points[0];
  const distance = last?.dist ?? 0;
  const elapsed = last && first ? last.t - first.t : 0;

  // Время в движении: дельты ≤15 с со скоростью >1 км/ч (из extensions или по Δs/Δt).
  // Раньше при speed===undefined паузы ошибочно считались движением.
  let moving = 0;
  for (let i = 1; i < points.length; i++) {
    const dt = points[i].t - points[i - 1].t;
    if (dt <= 0 || dt > 15) continue;
    let speed = points[i].speed;
    if (speed === undefined) {
      const dd = points[i].dist - points[i - 1].dist;
      speed = dd > 0 ? (dd / dt) * 3.6 : 0;
    }
    if (speed > 1) moving += dt;
  }
  if (moving === 0) moving = elapsed;

  const speeds = points
    .map((p) => p.speed)
    .filter((v): v is number => v !== undefined && v > 0);
  const gain = elevationGain(points);

  // Средняя скорость: по moving; если moving≈elapsed — то же. Макс. — по точкам.
  const avgSpeed = moving > 0 ? (distance / moving) * 3.6 : undefined;
  const maxSpeed = speeds.length ? Math.max(...speeds) : undefined;

  return {
    sport: undefined, // Apple Health в GPX вид спорта не пишет
    startTime: first?.time,
    distance,
    elapsed,
    moving,
    avgSpeed,
    maxSpeed:
      maxSpeed !== undefined && avgSpeed !== undefined
        ? Math.max(maxSpeed, avgSpeed)
        : maxSpeed ?? avgSpeed,
    ascent: gain.ascent || undefined,
    descent: gain.descent || undefined,
  };
};

let uid = 0;

/** Парсит GPX-файл в нормализованный Track. Всё — локально в браузере. */
export async function parseGpxBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  color: string,
  sourceId: string
): Promise<Track> {
  const text = new TextDecoder().decode(buffer);
  const doc = new DOMParser().parseFromString(text, 'application/xml');
  if (doc.getElementsByTagName('parsererror').length > 0) {
    throw new Error('invalid GPX (XML parse error)');
  }

  const points = normalizePoints(doc);
  if (!points.length) {
    // Код ошибки — переводится в UI (i18n/dict → errors.noRecords).
    throw new Error('noRecords');
  }

  return {
    id: `gpx-${++uid}`,
    sourceId,
    fileName: fileName.replace(/\.gpx$/i, ''),
    color,
    visible: true,
    points,
    summary: buildSummary(points),
    laps: [],
    hasGps: true,
  };
}
