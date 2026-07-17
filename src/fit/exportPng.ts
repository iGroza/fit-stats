/**
 * PNG-отчёт: снимок карты в текущем масштабе и положении + общая сводка +
 * тёмные графики по всем параметрам. Всё рисуется на canvas локально.
 */
import { APP_NAME, SITE_URL } from '../config';
import type { Fmt } from '../i18n';
import type { Dict } from '../i18n/dict';
import { mapHandle } from '../state/mapHandle';
import { DARK_THEME, renderMetricChartCanvas } from './chartImage';
import { computeTotals, isPaceSport } from './stats';
import { METRICS } from './types';
import type { Track } from './types';

const W = 1200;
const M = 40; // внешний отступ
const CARD_W = W - M * 2;

const FONT = '"DM Sans", "Segoe UI", Arial, sans-serif';
const UI_FONT = '"Geist", "Segoe UI", Arial, sans-serif';

const roundRect = (
  ctx: CanvasRenderingContext2D,
  x: number,
  y: number,
  w: number,
  h: number,
  r: number
) => {
  ctx.beginPath();
  ctx.moveTo(x + r, y);
  ctx.arcTo(x + w, y, x + w, y + h, r);
  ctx.arcTo(x + w, y + h, x, y + h, r);
  ctx.arcTo(x, y + h, x, y, r);
  ctx.arcTo(x, y, x + w, y, r);
  ctx.closePath();
};

/** Снимок текущего вида Leaflet-карты: тайлы из DOM + треки поверх. */
const snapshotMap = (tracks: Track[]): HTMLCanvasElement | null => {
  const { map, container } = mapHandle;
  if (!map || !container) return null;

  const rect = container.getBoundingClientRect();
  const canvas = document.createElement('canvas');
  canvas.width = rect.width * 2;
  canvas.height = rect.height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return null;
  ctx.scale(2, 2);

  ctx.fillStyle = '#161616';
  ctx.fillRect(0, 0, rect.width, rect.height);

  // Тайлы — уже загруженные <img> с crossOrigin: рисуем по их экранным позициям.
  for (const img of Array.from(container.querySelectorAll<HTMLImageElement>('img.leaflet-tile'))) {
    if (!img.complete || !img.naturalWidth) continue;
    const r = img.getBoundingClientRect();
    try {
      ctx.drawImage(img, r.left - rect.left, r.top - rect.top, r.width, r.height);
    } catch {
      /* повреждённый тайл пропускаем */
    }
  }

  // Треки: проекция latlng → контейнерные координаты текущего вида.
  for (const track of tracks) {
    if (!track.visible || !track.hasGps) continue;
    const pts = track.points.filter((p) => p.lat !== undefined && p.lng !== undefined);
    if (pts.length < 2) continue;
    const step = Math.max(1, Math.floor(pts.length / 2500));

    ctx.strokeStyle = track.color;
    ctx.lineWidth = 3;
    ctx.lineJoin = 'round';
    ctx.lineCap = 'round';
    ctx.beginPath();
    for (let i = 0; i < pts.length; i += step) {
      const cp = map.latLngToContainerPoint([pts[i].lat!, pts[i].lng!]);
      if (i === 0) ctx.moveTo(cp.x, cp.y);
      else ctx.lineTo(cp.x, cp.y);
    }
    ctx.stroke();

    const dot = (lat: number, lng: number, color: string) => {
      const cp = map.latLngToContainerPoint([lat, lng]);
      ctx.beginPath();
      ctx.arc(cp.x, cp.y, 6, 0, Math.PI * 2);
      ctx.fillStyle = color;
      ctx.fill();
      ctx.lineWidth = 2.5;
      ctx.strokeStyle = '#0a0a0a';
      ctx.stroke();
    };
    dot(pts[0].lat!, pts[0].lng!, '#4ade80');
    dot(pts[pts.length - 1].lat!, pts[pts.length - 1].lng!, '#f25e8a');
  }

  return canvas;
};

interface Chip {
  label: string;
  value: string;
}

const buildChips = (tracks: Track[], t: Dict, fmt: Fmt): Chip[] => {
  const totals = computeTotals(tracks);
  const paceMode = tracks.every((tr) => isPaceSport(tr.summary.sport));
  return [
    { label: t.cards.distance.label, value: fmt.distance(totals.distance) },
    { label: t.cards.moving.label, value: fmt.duration(totals.moving) },
    paceMode
      ? { label: t.cards.pace.label, value: fmt.pace(totals.avgSpeed) }
      : { label: t.cards.speed.label, value: fmt.speed(totals.avgSpeed) },
    {
      label: t.cards.hr.label,
      value: totals.avgHr ? `${Math.round(totals.avgHr)} ${t.units.bpm}` : '—',
    },
    { label: t.cards.ascent.label, value: `${Math.round(totals.ascent)} ${t.units.m}` },
    {
      label: t.cards.calories.label,
      value: totals.calories ? `${fmt.int(totals.calories)} ${t.units.kcal}` : '—',
    },
  ];
};

/** Собирает и скачивает PNG-отчёт по видимым трекам. */
export async function exportTracksPng(tracks: Track[], t: Dict, fmt: Fmt): Promise<void> {
  await document.fonts?.ready.catch(() => {});

  const mapShot = snapshotMap(tracks);
  const chips = buildChips(tracks, t, fmt);
  const charts = METRICS.map((m) => renderMetricChartCanvas(m, tracks, t, DARK_THEME)).filter(
    (c): c is HTMLCanvasElement => c !== null
  );

  // — раскладка —
  const HEADER_H = 96;
  const mapH = mapShot ? Math.round((CARD_W * mapShot.height) / mapShot.width) : 0;
  const CHIP_ROWS = Math.ceil(chips.length / 3);
  const CHIPS_H = CHIP_ROWS * 84 + (CHIP_ROWS - 1) * 16;
  const CHART_H = Math.round((CARD_W * 330) / 880);
  const chartsH = charts.length * (CHART_H + 20);
  const FOOTER_H = 56;
  const height =
    HEADER_H + (mapShot ? mapH + 28 : 0) + CHIPS_H + 28 + chartsH + FOOTER_H + M;

  const canvas = document.createElement('canvas');
  canvas.width = W * 2;
  canvas.height = height * 2;
  const ctx = canvas.getContext('2d');
  if (!ctx) return;
  ctx.scale(2, 2);

  // фон
  ctx.fillStyle = '#0a0a0a';
  ctx.fillRect(0, 0, W, height);
  const glow = ctx.createRadialGradient(W * 0.62, 0, 0, W * 0.62, 0, W * 0.7);
  glow.addColorStop(0, 'rgba(107, 98, 242, 0.22)');
  glow.addColorStop(1, 'rgba(107, 98, 242, 0)');
  ctx.fillStyle = glow;
  ctx.fillRect(0, 0, W, height);

  // — шапка: бренд + дата —
  ctx.fillStyle = '#6b62f2';
  roundRect(ctx, M, 30, 40, 40, 12);
  ctx.fill();
  ctx.strokeStyle = '#ffffff';
  ctx.lineWidth = 3;
  ctx.lineCap = 'round';
  ctx.beginPath(); // мини-маршрут в знаке
  ctx.moveTo(M + 11, 58);
  ctx.quadraticCurveTo(M + 14, 44, M + 22, 46);
  ctx.quadraticCurveTo(M + 30, 48, M + 29, 40);
  ctx.stroke();
  ctx.fillStyle = '#ffffff';
  ctx.font = `500 26px ${FONT}`;
  ctx.fillText(APP_NAME, M + 54, 58);
  ctx.textAlign = 'right';
  ctx.fillStyle = '#797979';
  ctx.font = `400 15px ${UI_FONT}`;
  ctx.fillText(new Date().toLocaleDateString(t.locale, { day: 'numeric', month: 'long', year: 'numeric' }), W - M, 58);
  ctx.textAlign = 'left';

  let y = HEADER_H;

  // — карта (текущий вид) —
  if (mapShot) {
    roundRect(ctx, M, y, CARD_W, mapH, 20);
    ctx.save();
    ctx.clip();
    ctx.drawImage(mapShot, M, y, CARD_W, mapH);
    ctx.restore();
    ctx.strokeStyle = 'rgba(229, 229, 229, 0.14)';
    ctx.lineWidth = 1;
    roundRect(ctx, M, y, CARD_W, mapH, 20);
    ctx.stroke();
    y += mapH + 28;
  }

  // — сводка (чипы 3×N) —
  const chipW = (CARD_W - 32) / 3;
  chips.forEach((chip, i) => {
    const cx = M + (i % 3) * (chipW + 16);
    const cy = y + Math.floor(i / 3) * (84 + 16);
    ctx.fillStyle = 'rgba(29, 29, 29, 0.92)';
    roundRect(ctx, cx, cy, chipW, 84, 16);
    ctx.fill();
    ctx.strokeStyle = 'rgba(229, 229, 229, 0.1)';
    roundRect(ctx, cx, cy, chipW, 84, 16);
    ctx.stroke();
    ctx.fillStyle = '#797979';
    ctx.font = `500 12px ${UI_FONT}`;
    ctx.fillText(chip.label.toUpperCase(), cx + 18, cy + 30);
    ctx.fillStyle = '#ffffff';
    ctx.font = `600 24px ${UI_FONT}`;
    ctx.fillText(chip.value, cx + 18, cy + 62);
  });
  y += CHIPS_H + 28;

  // — графики —
  for (const chart of charts) {
    roundRect(ctx, M, y, CARD_W, CHART_H, 20);
    ctx.save();
    ctx.clip();
    ctx.drawImage(chart, M, y, CARD_W, CHART_H);
    ctx.restore();
    ctx.strokeStyle = 'rgba(229, 229, 229, 0.1)';
    roundRect(ctx, M, y, CARD_W, CHART_H, 20);
    ctx.stroke();
    y += CHART_H + 20;
  }

  // — подвал —
  ctx.fillStyle = '#686868';
  ctx.font = `400 14px ${UI_FONT}`;
  ctx.fillText(t.xlsx.generated(SITE_URL), M, y + 28);

  // — скачивание —
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, 'image/png'));
  if (!blob) return;
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = 'fit-tracks.png';
  a.click();
  URL.revokeObjectURL(url);
}
