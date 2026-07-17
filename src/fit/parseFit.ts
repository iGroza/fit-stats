import FitParser from 'fit-file-parser';
import type { Split, Track, TrackPoint, TrackSummary } from './types';

/* fit-file-parser — CJS-модуль; в зависимости от бандлера конструктор лежит
   либо в default, либо в самом экспорте. */
const FitParserCtor: any = (FitParser as any).default ?? FitParser;

interface RawRecord {
  timestamp?: string | Date;
  position_lat?: number;
  position_long?: number;
  altitude?: number;
  speed?: number;
  distance?: number;
  heart_rate?: number;
  cadence?: number;
  power?: number;
  temperature?: number;
  elapsed_time?: number;
  step_length?: number;
  vertical_oscillation?: number;
  stance_time?: number;
}

const toDate = (v: unknown): Date | undefined => {
  if (!v) return undefined;
  const d = v instanceof Date ? v : new Date(v as string);
  return Number.isNaN(d.getTime()) ? undefined : d;
};

/** Расстояние между координатами, м (haversine). */
const haversine = (lat1: number, lng1: number, lat2: number, lng2: number): number => {
  const R = 6371000;
  const dLat = ((lat2 - lat1) * Math.PI) / 180;
  const dLng = ((lng2 - lng1) * Math.PI) / 180;
  const a =
    Math.sin(dLat / 2) ** 2 +
    Math.cos((lat1 * Math.PI) / 180) * Math.cos((lat2 * Math.PI) / 180) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(a));
};

const avg = (xs: number[]): number | undefined =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined;
const max = (xs: number[]): number | undefined => (xs.length ? Math.max(...xs) : undefined);
const min = (xs: number[]): number | undefined => (xs.length ? Math.min(...xs) : undefined);

const pick = (points: TrackPoint[], key: keyof TrackPoint, positive = false): number[] =>
  points
    .map((p) => p[key] as number | undefined)
    .filter((v): v is number => v !== undefined && (!positive || v > 0));

/** Набор/сброс высоты по точкам с гистерезисом 2 м против шума барометра. */
export const elevationGain = (points: TrackPoint[]): { ascent: number; descent: number } => {
  let ascent = 0;
  let descent = 0;
  let ref: number | undefined;
  for (const p of points) {
    if (p.alt === undefined) continue;
    if (ref === undefined) {
      ref = p.alt;
      continue;
    }
    const d = p.alt - ref;
    if (d >= 2) {
      ascent += d;
      ref = p.alt;
    } else if (d <= -2) {
      descent -= d;
      ref = p.alt;
    }
  }
  return { ascent: Math.round(ascent), descent: Math.round(descent) };
};

const parseWithLib = (buffer: ArrayBuffer): Promise<any> =>
  new Promise((resolve, reject) => {
    const parser = new FitParserCtor({
      force: true,
      speedUnit: 'km/h',
      lengthUnit: 'm',
      temperatureUnit: 'celsius',
      elapsedRecordField: true,
      mode: 'cascade',
    });
    parser.parse(buffer, (err: string | null, data: any) => {
      if (err) reject(new Error(err));
      else resolve(data);
    });
  });

/** Записи независимо от структуры (cascade / плоский список). */
const collectRecords = (data: any): RawRecord[] => {
  const sessions = data?.activity?.sessions ?? data?.sessions ?? [];
  const fromSessions = sessions.flatMap((s: any) =>
    (s.laps ?? []).flatMap((l: any) => l.records ?? [])
  );
  if (fromSessions.length) return fromSessions;
  return data?.records ?? [];
};

const collectLaps = (data: any): any[] => {
  const sessions = data?.activity?.sessions ?? data?.sessions ?? [];
  const laps = sessions.flatMap((s: any) => s.laps ?? []);
  return laps.length ? laps : data?.laps ?? [];
};

const normalizePoints = (records: RawRecord[]): TrackPoint[] => {
  const points: TrackPoint[] = [];
  let dist = 0;
  let prev: TrackPoint | undefined;
  let start: number | undefined;

  for (const r of records) {
    const time = toDate(r.timestamp);
    if (!time) continue;
    if (start === undefined) start = time.getTime();

    const p: TrackPoint = {
      time,
      t: r.elapsed_time ?? Math.round((time.getTime() - start) / 1000),
      dist: 0,
      lat: r.position_lat,
      lng: r.position_long,
      alt: r.altitude,
      speed: r.speed,
      pace: r.speed && r.speed > 0.5 ? Math.round((60 / r.speed) * 100) / 100 : undefined,
      hr: r.heart_rate,
      cadence: r.cadence,
      power: r.power,
      temp: r.temperature,
      // FIT пишет step_length и vertical_oscillation в мм, stance_time в мс.
      stride: r.step_length !== undefined ? r.step_length / 1000 : undefined,
      vo: r.vertical_oscillation !== undefined ? r.vertical_oscillation / 10 : undefined,
      gct: r.stance_time,
    };

    // Кумулятивная дистанция: из файла, иначе — по координатам.
    if (typeof r.distance === 'number') {
      dist = Math.max(dist, r.distance);
    } else if (
      prev &&
      p.lat !== undefined &&
      p.lng !== undefined &&
      prev.lat !== undefined &&
      prev.lng !== undefined
    ) {
      dist += haversine(prev.lat, prev.lng, p.lat, p.lng);
    }
    p.dist = dist;

    points.push(p);
    prev = p;
  }
  return points;
};

const normalizeLaps = (rawLaps: any[]): Split[] =>
  rawLaps.map((l, i) => {
    const distance = typeof l.total_distance === 'number' ? l.total_distance : 0;
    const time =
      (typeof l.total_timer_time === 'number' && l.total_timer_time > 0
        ? l.total_timer_time
        : undefined) ??
      (typeof l.total_elapsed_time === 'number' ? l.total_elapsed_time : 0);
    // fit-file-parser отдаёт avg_speed уже в km/h (speedUnit: 'km/h').
    const avgSpeed =
      typeof l.avg_speed === 'number' && l.avg_speed > 0
        ? l.avg_speed
        : distance > 0 && time > 0
          ? (distance / time) * 3.6
          : undefined;
    return {
      n: i + 1,
      distance,
      time,
      avgSpeed,
      avgHr: l.avg_heart_rate,
      maxHr: l.max_heart_rate,
      avgCadence: l.avg_cadence,
      avgPower: l.avg_power,
      ascent: l.total_ascent,
    };
  });

const buildSummary = (data: any, points: TrackPoint[]): TrackSummary => {
  const session = data?.activity?.sessions?.[0] ?? data?.sessions?.[0] ?? {};
  const last = points[points.length - 1];

  const distance: number = session.total_distance ?? last?.dist ?? 0;
  const elapsed: number =
    session.total_elapsed_time ?? (last && points[0] ? last.t - points[0].t : 0);
  const moving: number = session.total_timer_time ?? elapsed;

  const speeds = pick(points, 'speed', true);
  const hrs = pick(points, 'hr');
  const gain = elevationGain(points);

  return {
    sport: session.sport,
    startTime: toDate(session.start_time) ?? points[0]?.time,
    distance,
    elapsed,
    moving,
    // speedUnit: 'km/h' — avg/max_speed уже в км/ч; фолбэк: distance(m)/time(s)*3.6.
    avgSpeed:
      (typeof session.avg_speed === 'number' && session.avg_speed > 0
        ? session.avg_speed
        : undefined) ??
      (moving > 0 && distance > 0 ? (distance / moving) * 3.6 : avg(speeds)),
    maxSpeed:
      (typeof session.max_speed === 'number' && session.max_speed > 0
        ? session.max_speed
        : undefined) ?? max(speeds),
    avgHr: session.avg_heart_rate ?? avg(hrs),
    maxHr: session.max_heart_rate ?? max(hrs),
    minHr: session.min_heart_rate ?? min(hrs),
    avgCadence: session.avg_cadence ?? avg(pick(points, 'cadence', true)),
    maxCadence: session.max_cadence ?? max(pick(points, 'cadence', true)),
    avgPower: session.avg_power ?? avg(pick(points, 'power')),
    maxPower: session.max_power ?? max(pick(points, 'power')),
    avgTemp: session.avg_temperature ?? avg(pick(points, 'temp')),
    ascent: session.total_ascent ?? gain.ascent,
    descent: session.total_descent ?? gain.descent,
    calories: session.total_calories,
    avgStride:
      session.avg_step_length !== undefined
        ? session.avg_step_length / 1000
        : avg(pick(points, 'stride', true)),
    trainingEffect: session.total_training_effect,
    anaerobicTrainingEffect: session.total_anaerobic_training_effect,
    vo2max: session.vo2_max ?? data?.user_metrics?.[0]?.vo2_max,
  };
};

let uid = 0;

/** Парсит содержимое .fit в нормализованный Track. Всё — локально в браузере. */
export async function parseFitBuffer(
  buffer: ArrayBuffer,
  fileName: string,
  color: string,
  sourceId: string
): Promise<Track> {
  const data = await parseWithLib(buffer);
  const points = normalizePoints(collectRecords(data));
  if (!points.length) {
    // Код ошибки — переводится в UI (i18n/dict → errors.noRecords).
    throw new Error('noRecords');
  }
  return {
    id: `track-${++uid}`,
    sourceId,
    fileName: fileName.replace(/\.fit$/i, ''),
    color,
    visible: true,
    points,
    summary: buildSummary(data, points),
    laps: normalizeLaps(collectLaps(data)),
    hasGps: points.some((p) => p.lat !== undefined && p.lng !== undefined),
  };
}
