/**
 * Рендер графика метрики в canvas — для встраивания в Excel (светлая тема)
 * и в PNG-отчёт (тёмная тема, под палитру сайта).
 */
import type { Dict } from '../i18n/dict';
import { averageMetricSeries, hasMetric, metricSeries } from './stats';
import type { MetricDef, Track } from './types';

export type ChartView = 'each' | 'avg';

const W = 880;
const H = 330;
const PAD = { top: 44, right: 20, bottom: 46, left: 62 };

export interface ChartTheme {
  bg: string;
  title: string;
  grid: string;
  axisText: string;
  legend: string;
}

export const LIGHT_THEME: ChartTheme = {
  bg: '#ffffff',
  title: '#1d1d1d',
  grid: '#ececec',
  axisText: '#8a8a8a',
  legend: '#505050',
};

export const DARK_THEME: ChartTheme = {
  bg: '#161616',
  title: '#ffffff',
  grid: 'rgba(229, 229, 229, 0.09)',
  axisText: '#797979',
  legend: '#c2c2c2',
};

const fmt = (v: number): string =>
  Math.abs(v) >= 100 ? String(Math.round(v)) : String(Math.round(v * 10) / 10);

export function renderMetricChartCanvas(
  metric: MetricDef,
  tracks: Track[],
  t: Dict,
  theme: ChartTheme = LIGHT_THEME,
  view: ChartView = 'each'
): HTMLCanvasElement | null {
  const withData = tracks.filter((tr) => hasMetric(tr, metric.key));
  const series =
    view === 'avg'
      ? [
          {
            name: t.sections.charts.avgSeries,
            color: '#6b62f2',
            data: averageMetricSeries(withData, metric.key, 'dist', 400),
          },
        ].filter((s) => s.data.length > 1)
      : withData
          .map((tr) => ({
            name: tr.fileName,
            color: tr.color,
            data: metricSeries(tr, metric.key, 'dist', 400),
          }))
          .filter((s) => s.data.length > 1);
  if (!series.length) return null;

  const canvas = document.createElement('canvas');
  canvas.width = W * 2; // retina-чёткость
  canvas.height = H * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);

  const xs = series.flatMap((s) => s.data.map((p) => p.x));
  const ys = series.flatMap((s) => s.data.map((p) => p.y));
  const xMin = Math.min(...xs);
  const xMax = Math.max(...xs);
  let yMin = Math.min(...ys);
  let yMax = Math.max(...ys);
  if (yMin === yMax) {
    yMin -= 1;
    yMax += 1;
  }
  const yPad = (yMax - yMin) * 0.08;
  yMin -= yPad;
  yMax += yPad;

  const plotW = W - PAD.left - PAD.right;
  const plotH = H - PAD.top - PAD.bottom;
  const px = (x: number) => PAD.left + ((x - xMin) / (xMax - xMin || 1)) * plotW;
  const py = (y: number) => {
    const k = (y - yMin) / (yMax - yMin);
    // Темп: меньше = лучше, ось перевёрнута — как на графиках в приложении.
    return metric.reversed ? PAD.top + k * plotH : PAD.top + (1 - k) * plotH;
  };

  // фон
  ctx.fillStyle = theme.bg;
  ctx.fillRect(0, 0, W, H);

  // заголовок
  const md = t.metrics[metric.key];
  ctx.fillStyle = theme.title;
  ctx.font = '600 15px "DM Sans", Arial, sans-serif';
  ctx.fillText(`${md.label}, ${md.unit}`, PAD.left, 24);

  // сетка + подписи Y
  ctx.font = '400 11px Arial, sans-serif';
  ctx.textAlign = 'right';
  const Y_TICKS = 5;
  for (let i = 0; i <= Y_TICKS; i++) {
    const v = yMin + ((yMax - yMin) * i) / Y_TICKS;
    const y = py(v);
    ctx.strokeStyle = theme.grid;
    ctx.beginPath();
    ctx.moveTo(PAD.left, y);
    ctx.lineTo(W - PAD.right, y);
    ctx.stroke();
    ctx.fillStyle = theme.axisText;
    ctx.fillText(fmt(v), PAD.left - 8, y + 4);
  }

  // подписи X (км)
  ctx.textAlign = 'center';
  const X_TICKS = 8;
  for (let i = 0; i <= X_TICKS; i++) {
    const v = xMin + ((xMax - xMin) * i) / X_TICKS;
    ctx.fillStyle = theme.axisText;
    ctx.fillText(fmt(v), px(v), H - PAD.bottom + 18);
  }
  ctx.fillText(t.units.km, W - PAD.right, H - PAD.bottom + 34);

  // серии
  for (const { color, data } of series) {
    ctx.strokeStyle = color;
    ctx.lineWidth = 1.8;
    ctx.lineJoin = 'round';
    ctx.beginPath();
    data.forEach((p, i) => {
      if (i === 0) ctx.moveTo(px(p.x), py(p.y));
      else ctx.lineTo(px(p.x), py(p.y));
    });
    ctx.stroke();
  }

  // легенда
  ctx.textAlign = 'left';
  let lx = PAD.left + 180;
  ctx.font = '400 12px Arial, sans-serif';
  for (const { name, color } of series) {
    ctx.fillStyle = color;
    ctx.beginPath();
    ctx.arc(lx, 20, 4, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = theme.legend;
    const label = name.length > 24 ? `${name.slice(0, 24)}…` : name;
    ctx.fillText(label, lx + 9, 24);
    lx += 9 + ctx.measureText(label).width + 20;
    if (lx > W - PAD.right - 100) break; // легенда не влезает — обрезаем
  }

  return canvas;
}

/** PNG для Excel (светлая тема). */
export function renderMetricChartPng(
  metric: MetricDef,
  tracks: Track[],
  t: Dict,
  view: ChartView = 'each'
): string | null {
  return renderMetricChartCanvas(metric, tracks, t, LIGHT_THEME, view)?.toDataURL('image/png') ?? null;
}
