/**
 * Экспорт в Excel (exceljs): стилизованные листы с автошириной колонок,
 * ссылкой на сайт и PNG-графиками метрик.
 */
import { APP_NAME, SITE_URL } from '../config';
import type { Fmt } from '../i18n';
import { sportLabel } from '../i18n';
import type { Dict } from '../i18n/dict';
import { renderMetricChartPng } from './chartImage';
import {
  aggregateHrZones,
  computeHrZones,
  computeSplits,
  detectIntervals,
  isPaceSport,
} from './stats';
import type { HrZone } from './stats';
import { METRICS } from './types';
import type { Split, Track } from './types';

type Row = (string | number | Date | undefined)[];

const INDIGO = 'FF6B62F2';
const ZEBRA = 'FFF4F3FE';
const BORDER = { style: 'thin' as const, color: { argb: 'FFDDDDDD' } };

const r1 = (v?: number): number | undefined =>
  v === undefined ? undefined : Math.round(v * 10) / 10;

/** Ширина колонки по самой длинной строке содержимого. */
const autoWidth = (header: string[], rows: Row[]): number[] =>
  header.map((h, i) => {
    let max = h.length;
    for (const row of rows) {
      const v = row[i];
      const len =
        v instanceof Date ? 16 : v === undefined ? 1 : String(v).length;
      if (len > max) max = len;
    }
    return Math.min(Math.max(max + 3, 10), 42);
  });

const addStyledTable = (
  ws: import('exceljs').Worksheet,
  header: string[],
  rows: Row[],
  startRow: number
): void => {
  const headRow = ws.getRow(startRow);
  headRow.values = header;
  headRow.eachCell((cell) => {
    cell.font = { bold: true, color: { argb: 'FFFFFFFF' }, size: 11, name: 'Calibri' };
    cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: INDIGO } };
    cell.alignment = { vertical: 'middle', horizontal: 'center', wrapText: true };
    cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
  });
  headRow.height = 28;

  rows.forEach((row, i) => {
    const r = ws.getRow(startRow + 1 + i);
    r.values = row as import('exceljs').CellValue[];
    r.eachCell({ includeEmpty: false }, (cell) => {
      cell.border = { top: BORDER, bottom: BORDER, left: BORDER, right: BORDER };
      cell.alignment = { vertical: 'middle' };
      if (i % 2 === 1) {
        cell.fill = { type: 'pattern', pattern: 'solid', fgColor: { argb: ZEBRA } };
      }
    });
  });

  ws.columns.forEach((col, i) => {
    col.width = autoWidth(header, rows)[i];
  });
};

/** Шапка листа: название приложения со ссылкой на сайт. */
const addTitle = (ws: import('exceljs').Worksheet, t: Dict, subtitle: string, span: number): void => {
  ws.mergeCells(1, 1, 1, Math.max(span, 4));
  const title = ws.getCell(1, 1);
  title.value = {
    text: `${APP_NAME} — ${subtitle}`,
    hyperlink: `${SITE_URL}/`,
    tooltip: t.xlsx.openSite,
  };
  title.font = { bold: true, size: 14, color: { argb: INDIGO }, underline: true, name: 'Calibri' };
  ws.getRow(1).height = 24;
  const note = ws.getCell(2, 1);
  note.value = t.xlsx.generated(SITE_URL);
  note.font = { size: 9, color: { argb: 'FF8A8A8A' }, name: 'Calibri' };
};

/* Имя листа Excel: ≤31 символ, без запрещённых знаков. */
const sheetName = (name: string, suffix: string, i: number): string => {
  const clean = name.replace(/[\\/?*[\]:]/g, ' ');
  return `${i + 1} ${clean}`.slice(0, 30 - suffix.length) + ' · ' + suffix;
};

/** Лист отсечек одного режима (1 км / 5 км / круги / интервалы). */
const addSplitsSheet = (
  wb: import('exceljs').Workbook,
  tr: Track,
  trackIndex: number,
  t: Dict,
  fmt: Fmt,
  opts: {
    suffix: string;
    subtitle: string;
    nHeader: string;
    splits: Split[];
    showKind?: boolean;
  }
): void => {
  const { splits } = opts;
  if (!splits.length) return;

  const pace = isPaceSport(tr.summary.sport);
  const header: string[] = [
    opts.nHeader,
    ...(opts.showKind ? [t.xlsx.splitsHeaderCategory] : []),
    t.xlsx.splitsHeaderDist,
    t.xlsx.splitsHeader[0], // время / длительность
    pace ? t.xlsx.splitsPace : t.xlsx.splitsSpeed,
    ...t.xlsx.splitsHeader.slice(1),
  ];

  const rows: Row[] = splits.map((s) => [
    s.n,
    ...(opts.showKind ? [s.kind ? t.splits.kinds[s.kind] : undefined] : []),
    Math.round(s.distance),
    fmt.clock(s.time),
    pace ? fmt.paceBare(s.avgSpeed) : r1(s.avgSpeed),
    s.avgHr ? Math.round(s.avgHr) : undefined,
    s.maxHr,
    s.avgCadence ? Math.round(s.avgCadence) : undefined,
    s.ascent !== undefined ? Math.round(s.ascent) : undefined,
  ]);

  // Для интервалов — итоговые длительности по категориям (работа / отдых / …).
  if (opts.showKind) {
    const order = ['warmup', 'work', 'rest', 'cooldown'] as const;
    const totals = new Map<string, { time: number; n: number; dist: number }>();
    for (const s of splits) {
      if (!s.kind) continue;
      const cur = totals.get(s.kind) ?? { time: 0, n: 0, dist: 0 };
      cur.time += s.time;
      cur.dist += s.distance;
      cur.n += 1;
      totals.set(s.kind, cur);
    }
    for (const kind of order) {
      const tot = totals.get(kind);
      if (!tot) continue;
      rows.push([
        t.xlsx.splitsTotalLabel,
        t.splits.kinds[kind],
        Math.round(tot.dist),
        fmt.clock(tot.time),
        undefined,
        undefined,
        undefined,
        undefined,
        undefined,
      ]);
    }
  }

  const ws = wb.addWorksheet(sheetName(tr.fileName, opts.suffix, trackIndex), {
    views: [{ state: 'frozen', ySplit: 4 }],
  });
  addTitle(ws, t, opts.subtitle, header.length);
  addStyledTable(ws, header, rows, 4);
};

/** Лист «Зоны пульса»: по каждому треку (и суммарно) — время и доля в зонах. */
const addHrZonesSheet = (
  wb: import('exceljs').Workbook,
  tracks: Track[],
  t: Dict,
  fmt: Fmt
): void => {
  const zoneRows = (label: string, zones: HrZone[]): Row[] => {
    const total = zones.reduce((s, z) => s + z.time, 0) || 1;
    return zones.map((z, i) => [
      i === 0 ? label : undefined,
      t.hrZones.zone(z.zone),
      `${z.min}–${z.max}`,
      fmt.clock(z.time),
      Math.floor((z.time / total) * 100),
    ]);
  };

  const rows: Row[] = [];
  if (tracks.length > 1) {
    const agg = aggregateHrZones(tracks);
    if (agg) rows.push(...zoneRows(t.xlsx.hrZonesAll, agg));
  }
  for (const tr of tracks) {
    const zones = computeHrZones(tr);
    if (zones) rows.push(...zoneRows(tr.fileName, zones));
  }
  if (!rows.length) return;

  const ws = wb.addWorksheet(t.xlsx.hrZonesSheet, { views: [{ state: 'frozen', ySplit: 4 }] });
  addTitle(ws, t, t.xlsx.hrZonesSubtitle, t.xlsx.hrZonesHeader.length);
  addStyledTable(ws, [...t.xlsx.hrZonesHeader], rows, 4);
};

/** Экспорт всех треков в один .xlsx: сводка + графики + записи и сплиты. */
export async function exportTracksXlsx(tracks: Track[], t: Dict, fmt: Fmt): Promise<void> {
  const ExcelJS = await import('exceljs');
  const wb = new ExcelJS.Workbook();
  wb.creator = APP_NAME;
  wb.created = new Date();

  /* ── Сводка ── */
  const summaryRows: Row[] = tracks.map((tr) => {
    const s = tr.summary;
    return [
      tr.fileName,
      sportLabel(t, s.sport),
      s.startTime
        ? s.startTime.toLocaleString(t.locale, {
            day: '2-digit',
            month: '2-digit',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : undefined,
      r1(s.distance / 1000),
      fmt.duration(s.elapsed),
      fmt.duration(s.moving),
      isPaceSport(s.sport) ? fmt.paceBare(s.avgSpeed) : undefined,
      r1(s.avgSpeed),
      r1(s.maxSpeed),
      s.avgHr && Math.round(s.avgHr),
      s.maxHr && Math.round(s.maxHr),
      s.avgCadence && Math.round(s.avgCadence),
      s.avgPower && Math.round(s.avgPower),
      s.ascent !== undefined ? Math.round(s.ascent) : undefined,
      s.descent !== undefined ? Math.round(s.descent) : undefined,
      s.calories && Math.round(s.calories),
    ];
  });
  const wsSummary = wb.addWorksheet(t.xlsx.summarySheet, { views: [{ state: 'frozen', ySplit: 4 }] });
  addTitle(wsSummary, t, t.xlsx.summarySubtitle, t.xlsx.summaryHeader.length);
  addStyledTable(wsSummary, [...t.xlsx.summaryHeader], summaryRows, 4);

  /* ── Зоны пульса ── */
  addHrZonesSheet(wb, tracks, t, fmt);

  /* Много треков: не пишем лист «каждый» (сотни линий) и не дублируем avg. */
  const manyTracks = tracks.length > 12;
  const addChartsSheet = (sheetTitle: string, subtitle: string, view: 'each' | 'avg') => {
    const ws = wb.addWorksheet(sheetTitle);
    addTitle(ws, t, subtitle, 8);
    let row = 3;
    for (const metric of METRICS) {
      const png = renderMetricChartPng(metric, tracks, t, view);
      if (!png) continue;
      const imgId = wb.addImage({ base64: png, extension: 'png' });
      ws.addImage(imgId, {
        tl: { col: 0, row },
        ext: { width: 880, height: 330 },
      });
      row += 18; // ~330px при высоте строки 18.75
    }
  };
  if (manyTracks) {
    addChartsSheet(t.xlsx.chartsAvgSheet, t.xlsx.chartsAvgSubtitle, 'avg');
  } else {
    addChartsSheet(t.xlsx.chartsSheet, t.xlsx.chartsSubtitle, 'each');
    if (tracks.length > 1) {
      addChartsSheet(t.xlsx.chartsAvgSheet, t.xlsx.chartsAvgSubtitle, 'avg');
    }
  }

  /* Поточечные «записи» раздувают xlsx на сотни МБ — только при малом наборе. */
  const includeRecords = tracks.length <= 15;
  /* 5 км + круги + интервалы — всегда; при 50+ треках хватает 1 км. */
  const includeAllSplitModes = tracks.length <= 40;

  /* ── По каждому треку: записи (опц.) + отсечки ── */
  tracks.forEach((tr, i) => {
    if (includeRecords) {
      const recRows: Row[] = tr.points.map((p) => [
        p.time.toLocaleTimeString(t.locale),
        p.t,
        Math.round(p.dist),
        p.lat !== undefined ? Math.round(p.lat * 1e6) / 1e6 : undefined,
        p.lng !== undefined ? Math.round(p.lng * 1e6) / 1e6 : undefined,
        r1(p.alt),
        r1(p.speed),
        p.hr,
        p.cadence,
        p.power,
        p.temp,
      ]);
      const wsRec = wb.addWorksheet(sheetName(tr.fileName, t.xlsx.recordsSuffix, i), {
        views: [{ state: 'frozen', ySplit: 4 }],
      });
      addTitle(wsRec, t, t.xlsx.recordsSubtitle(tr.fileName), t.xlsx.recordsHeader.length);
      addStyledTable(wsRec, [...t.xlsx.recordsHeader], recRows, 4);
    }

    const intervals = includeAllSplitModes ? detectIntervals(tr) : [];
    const splits1 = computeSplits(tr, 1000);
    const splits5 = includeAllSplitModes ? computeSplits(tr, 5000) : [];
    const hasLaps = includeAllSplitModes && tr.laps.length > 1;

    if (intervals.length >= 4) {
      addSplitsSheet(wb, tr, i, t, fmt, {
        suffix: t.xlsx.intervalsSuffix,
        subtitle: t.xlsx.splitsIntervalsSubtitle(tr.fileName),
        nHeader: t.xlsx.splitsHeaderN,
        splits: intervals,
        showKind: true,
      });
    }

    if (splits1.length > 0) {
      addSplitsSheet(wb, tr, i, t, fmt, {
        suffix: t.xlsx.kmSuffix,
        subtitle: t.xlsx.splits1kmSubtitle(tr.fileName),
        nHeader: t.xlsx.splitsHeaderKm,
        splits: splits1,
      });
    }

    if (splits5.length > 0) {
      addSplitsSheet(wb, tr, i, t, fmt, {
        suffix: t.xlsx.km5Suffix,
        subtitle: t.xlsx.splits5kmSubtitle(tr.fileName),
        nHeader: t.xlsx.splitsHeaderN,
        splits: splits5,
      });
    }

    if (hasLaps) {
      addSplitsSheet(wb, tr, i, t, fmt, {
        suffix: t.xlsx.lapsSuffix,
        subtitle: t.xlsx.splitsLapsSubtitle(tr.fileName),
        nHeader: t.xlsx.splitsHeaderLap,
        splits: tr.laps,
      });
    }
  });

  /* ── Скачивание ── */
  const buffer = await wb.xlsx.writeBuffer();
  const blob = new Blob([buffer], {
    type: 'application/vnd.openxmlformats-officedocument.spreadsheetml.sheet',
  });
  const url = URL.createObjectURL(blob);
  const a = document.createElement('a');
  a.href = url;
  a.download = t.xlsx.fileName;
  a.click();
  URL.revokeObjectURL(url);
}
