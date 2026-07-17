import { elevationGain } from './parseFit';
import type { MetricKey, Split, SplitKind, Track, TrackPoint } from './types';

/** Бег/ходьба — метрика скорости выводится темпом. */
export const isPaceSport = (sport?: string): boolean =>
  !sport || ['running', 'walking', 'hiking', 'trail_running'].includes(sport);

/* ───────────────────────────── Агрегаты ───────────────────────────────── */

export interface Totals {
  count: number;
  distance: number;
  elapsed: number;
  moving: number;
  ascent: number;
  descent: number;
  calories: number;
  avgSpeed?: number;
  maxSpeed?: number;
  avgHr?: number;
  maxHr?: number;
}

/** Общая сводка по трекам; средние — взвешенные по времени движения. */
export const computeTotals = (tracks: Track[]): Totals => {
  const t: Totals = {
    count: tracks.length,
    distance: 0,
    elapsed: 0,
    moving: 0,
    ascent: 0,
    descent: 0,
    calories: 0,
  };
  let hrWeight = 0;
  let hrSum = 0;
  let maxSpeed: number | undefined;
  let maxHr: number | undefined;

  for (const track of tracks) {
    const s = track.summary;
    t.distance += s.distance;
    t.elapsed += s.elapsed;
    t.moving += s.moving;
    t.ascent += s.ascent ?? 0;
    t.descent += s.descent ?? 0;
    t.calories += s.calories ?? 0;
    if (s.avgHr !== undefined) {
      hrSum += s.avgHr * s.moving;
      hrWeight += s.moving;
    }
    if (s.maxSpeed !== undefined) maxSpeed = Math.max(maxSpeed ?? 0, s.maxSpeed);
    if (s.maxHr !== undefined) maxHr = Math.max(maxHr ?? 0, s.maxHr);
  }

  t.avgSpeed = t.moving > 0 ? (t.distance / t.moving) * 3.6 : undefined;
  t.avgHr = hrWeight > 0 ? hrSum / hrWeight : undefined;
  t.maxSpeed = maxSpeed;
  t.maxHr = maxHr;
  return t;
};

/* ───────────────────────────── Сплиты ─────────────────────────────────── */

const avg = (xs: number[]): number | undefined =>
  xs.length ? xs.reduce((s, x) => s + x, 0) / xs.length : undefined;

/**
 * Расчётные сплиты по каждому N-му километру (1 км, 5 км, …) из записей —
 * работают даже когда отсечки кругов на часах не задавались.
 */
export const computeSplits = (track: Track, splitMeters: number): Split[] => {
  const splits: Split[] = [];
  let bucket: TrackPoint[] = [];
  let boundary = splitMeters;
  let prevT = track.points[0]?.t ?? 0;
  let prevDist = 0;

  const flush = (endDist: number, endT: number) => {
    const hrs = bucket.map((p) => p.hr).filter((v): v is number => v !== undefined);
    const cads = bucket.map((p) => p.cadence).filter((v): v is number => v !== undefined && v > 0);
    const pows = bucket.map((p) => p.power).filter((v): v is number => v !== undefined);
    const distance = endDist - prevDist;
    const time = endT - prevT;
    if (distance < splitMeters * 0.05 || time <= 0) return;
    const gain = elevationGain(bucket);
    splits.push({
      n: splits.length + 1,
      distance,
      time,
      avgSpeed: (distance / time) * 3.6,
      avgHr: avg(hrs),
      maxHr: hrs.length ? Math.max(...hrs) : undefined,
      avgCadence: avg(cads),
      avgPower: avg(pows),
      ascent: gain.ascent,
    });
    prevDist = endDist;
    prevT = endT;
    bucket = [];
  };

  for (const p of track.points) {
    bucket.push(p);
    if (p.dist >= boundary) {
      flush(p.dist, p.t);
      boundary += splitMeters;
    }
  }
  const last = track.points[track.points.length - 1];
  if (last) flush(last.dist, last.t);
  return splits;
};

/* ───────────────────────────── Авто-интервалы ─────────────────────────── */

const quantile = (sorted: number[], q: number): number =>
  sorted[Math.min(sorted.length - 1, Math.floor(sorted.length * q))];

/**
 * Автоматическое определение интервалов (работа/отдых) по скорости — файл
 * часто не содержит разметки, Garmin Connect строит её так же, эвристикой.
 *
 * Скорость сглаживается окном, при бимодальном распределении точки делятся
 * порогом на «быстро»/«медленно», короткие сегменты сливаются с соседями,
 * затем сегменты размечаются: разминка → работа/отдых → заминка.
 */
export const detectIntervals = (track: Track): Split[] => {
  const pts = track.points;
  if (pts.length < 120) return [];

  // Сглаживание скорости окном ±7 записей.
  const speeds = pts.map((p) => p.speed ?? 0);
  const HALF = 7;
  const smooth: number[] = new Array(pts.length);
  let windowSum = 0;
  let lo = 0;
  let hi = -1;
  for (let i = 0; i < pts.length; i++) {
    while (hi < Math.min(pts.length - 1, i + HALF)) windowSum += speeds[++hi];
    while (lo < i - HALF) windowSum -= speeds[lo++];
    smooth[i] = windowSum / (hi - lo + 1);
  }

  // Порог между «медленно» и «быстро»: распределение должно быть бимодальным.
  const moving = smooth.filter((v) => v > 1).sort((a, b) => a - b);
  if (moving.length < 100) return [];
  const slowQ = quantile(moving, 0.2);
  const fastQ = quantile(moving, 0.8);
  if (slowQ <= 0 || fastQ / slowQ < 1.45) return []; // ровный темп — интервалов нет
  const threshold = (slowQ + fastQ) / 2;

  // Сегментация с слиянием коротких (<25 с) сегментов.
  interface Seg {
    from: number;
    to: number;
    fast: boolean;
  }
  const segs: Seg[] = [];
  for (let i = 0; i < pts.length; i++) {
    const fast = smooth[i] >= threshold;
    const last = segs[segs.length - 1];
    if (last && last.fast === fast) last.to = i;
    else segs.push({ from: i, to: i, fast });
  }
  const durOf = (s: Seg) => pts[s.to].t - pts[s.from].t;
  let merged = true;
  while (merged && segs.length > 1) {
    merged = false;
    for (let i = 0; i < segs.length; i++) {
      if (durOf(segs[i]) >= 25) continue;
      const into = i > 0 ? i - 1 : i + 1;
      segs[into] = {
        from: Math.min(segs[into].from, segs[i].from),
        to: Math.max(segs[into].to, segs[i].to),
        fast: segs[into].fast,
      };
      segs.splice(i, 1);
      merged = true;
      break;
    }
  }
  // Слить соседей одного типа после чистки.
  for (let i = segs.length - 1; i > 0; i--) {
    if (segs[i].fast === segs[i - 1].fast) {
      segs[i - 1].to = segs[i].to;
      segs.splice(i, 1);
    }
  }

  const workCount = segs.filter((s) => s.fast).length;
  if (workCount < 2 || segs.length < 4) return []; // не похоже на интервалы

  // Разметка: медленное начало — разминка, медленный конец — заминка.
  const lastFast = segs.map((s) => s.fast).lastIndexOf(true);
  const kinds: SplitKind[] = segs.map((s, i) => {
    if (s.fast) return 'work';
    if (i === 0) return 'warmup';
    if (i > lastFast) return 'cooldown';
    return 'rest';
  });

  // Агрегация сегментов в сплиты.
  return segs.map((s, i) => {
    const slice = pts.slice(s.from, s.to + 1);
    const startDist = pts[s.from].dist;
    const startT = pts[s.from].t;
    const distance = pts[s.to].dist - startDist;
    const time = pts[s.to].t - startT;
    const hrs = slice.map((p) => p.hr).filter((v): v is number => v !== undefined);
    const cads = slice.map((p) => p.cadence).filter((v): v is number => v !== undefined && v > 0);
    const pows = slice.map((p) => p.power).filter((v): v is number => v !== undefined);
    const gain = elevationGain(slice);
    return {
      n: i + 1,
      kind: kinds[i],
      distance,
      time,
      avgSpeed: time > 0 ? (distance / time) * 3.6 : undefined,
      avgHr: avg(hrs),
      maxHr: hrs.length ? Math.max(...hrs) : undefined,
      avgCadence: avg(cads),
      avgPower: avg(pows),
      ascent: gain.ascent,
    };
  });
};

/* ───────────────────────────── Серии для графиков ─────────────────────── */

export type ChartAxis = 'dist' | 'time';

export interface ChartPoint {
  /** X: км либо минуты. */
  x: number;
  y: number;
}

/**
 * Серия точек метрики для трека, прорежённая до ~maxPoints
 * (усреднение по бакетам — сглаживает шум и держит графики быстрыми).
 */
export const metricSeries = (
  track: Track,
  key: MetricKey,
  axis: ChartAxis,
  maxPoints = 300
): ChartPoint[] => {
  const pts = track.points;
  if (!pts.length) return [];
  const step = Math.max(1, Math.ceil(pts.length / maxPoints));
  const series: ChartPoint[] = [];

  for (let i = 0; i < pts.length; i += step) {
    let sum = 0;
    let n = 0;
    for (let j = i; j < Math.min(i + step, pts.length); j++) {
      const v = pts[j][key];
      if (v !== undefined) {
        sum += v;
        n++;
      }
    }
    if (!n) continue;
    const anchor = pts[Math.min(i + step - 1, pts.length - 1)];
    series.push({
      x: Math.round((axis === 'dist' ? anchor.dist / 1000 : anchor.t / 60) * 100) / 100,
      y: Math.round((sum / n) * 10) / 10,
    });
  }
  return series;
};

/** Есть ли у трека данные по метрике. */
export const hasMetric = (track: Track, key: MetricKey): boolean =>
  track.points.some((p) => p[key] !== undefined);

/**
 * Усреднённая по всем трекам серия: значения метрики всех треков
 * раскладываются в бакеты по оси X и усредняются в каждом бакете.
 */
export const averageMetricSeries = (
  tracks: Track[],
  key: MetricKey,
  axis: ChartAxis,
  maxPoints = 300
): ChartPoint[] => {
  const seriesList = tracks
    .map((tr) => metricSeries(tr, key, axis, maxPoints))
    .filter((s) => s.length > 0);
  if (!seriesList.length) return [];

  const xMin = Math.min(...seriesList.map((s) => s[0].x));
  const xMax = Math.max(...seriesList.map((s) => s[s.length - 1].x));
  const n = Math.min(maxPoints, 300);
  const step = (xMax - xMin) / n || 1;
  const sums = new Array<number>(n + 1).fill(0);
  const counts = new Array<number>(n + 1).fill(0);

  for (const s of seriesList) {
    for (const p of s) {
      const idx = Math.min(n, Math.max(0, Math.round((p.x - xMin) / step)));
      sums[idx] += p.y;
      counts[idx]++;
    }
  }

  const out: ChartPoint[] = [];
  for (let i = 0; i <= n; i++) {
    if (!counts[i]) continue;
    out.push({
      x: Math.round((xMin + i * step) * 100) / 100,
      y: Math.round((sums[i] / counts[i]) * 10) / 10,
    });
  }
  return out;
};
