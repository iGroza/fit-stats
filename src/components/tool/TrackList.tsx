import { memo, useMemo, useState } from "react";
import { VirtualList } from "../common/VirtualList";
import { computeSplits, detectIntervals, isPaceSport } from "../../fit/stats";
import type { Split, SplitKind, Track } from "../../fit/types";
import { useI18n, sportLabel } from "../../i18n";
import type { Dict } from "../../i18n/dict";
import type { Fmt } from "../../i18n";
import { useTracks } from "../../state/TracksContext";
import { TrackDetailModal } from "./TrackDetailModal";

const SPORT_ICONS: Record<string, string> = {
  running: "fa-person-running",
  cycling: "fa-person-biking",
  walking: "fa-person-walking",
  hiking: "fa-person-hiking",
  swimming: "fa-person-swimming",
};

type SplitMode = "1km" | "5km" | "laps" | "intervals";

/** Ключи сортировки списка треков. */
export type TrackSortKey =
  | "date"
  | "name"
  | "sport"
  | "distance"
  | "duration"
  | "pace";

const KIND_COLORS: Record<SplitKind, string> = {
  warmup: "#f2a35e",
  work: "#4ade80",
  rest: "#797979",
  cooldown: "#5ec8f2",
};

const KIND_ORDER: SplitKind[] = ["warmup", "work", "rest", "cooldown"];

/** Суммарная длительность (и число отрезков) по категориям интервалов. */
const kindTotals = (
  splits: Split[],
): { kind: SplitKind; n: number; time: number }[] => {
  const map = new Map<SplitKind, { n: number; time: number }>();
  for (const s of splits) {
    if (!s.kind) continue;
    const cur = map.get(s.kind) ?? { n: 0, time: 0 };
    cur.n += 1;
    cur.time += s.time;
    map.set(s.kind, cur);
  }
  return KIND_ORDER.flatMap((kind) => {
    const tot = map.get(kind);
    return tot ? [{ kind, n: tot.n, time: tot.time }] : [];
  });
};

const compareTracks = (
  a: Track,
  b: Track,
  key: TrackSortKey,
  dir: 1 | -1,
): number => {
  let cmp = 0;
  switch (key) {
    case "date":
      cmp =
        (a.summary.startTime?.getTime() ?? 0) -
        (b.summary.startTime?.getTime() ?? 0);
      break;
    case "name":
      cmp = a.fileName.localeCompare(b.fileName, undefined, {
        sensitivity: "base",
      });
      break;
    case "sport":
      cmp = (a.summary.sport ?? "").localeCompare(b.summary.sport ?? "");
      break;
    case "distance":
      cmp = a.summary.distance - b.summary.distance;
      break;
    case "duration":
      cmp = a.summary.moving - b.summary.moving;
      break;
    case "pace": {
      // Меньше темп (мин/км) = быстрее; для вело — по скорости, выше = быстрее.
      // Сортируем так, чтобы «лучше» было едино: dir desc = сначала «сильнее».
      const aPace = a.summary.avgSpeed ?? 0;
      const bPace = b.summary.avgSpeed ?? 0;
      cmp = aPace - bPace;
      break;
    }
    default:
      cmp = 0;
  }
  if (cmp === 0) cmp = a.fileName.localeCompare(b.fileName);
  return cmp * dir;
};

const SplitsTable = ({ track }: { track: Track }) => {
  const { t, fmt } = useI18n();
  const intervals = useMemo(() => detectIntervals(track), [track]);
  const hasIntervals = intervals.length >= 4;
  const [mode, setMode] = useState<SplitMode>(
    hasIntervals ? "intervals" : "1km",
  );
  const splits: Split[] = useMemo(() => {
    if (mode === "intervals") return intervals;
    if (mode === "laps") return track.laps;
    return computeSplits(track, mode === "1km" ? 1000 : 5000);
  }, [track, mode, intervals]);

  const pace = isPaceSport(track.summary.sport);
  const hasLaps = track.laps.length > 1;
  const showKind = mode === "intervals";
  const totals = useMemo(
    () => (showKind ? kindTotals(splits) : []),
    [showKind, splits],
  );

  return (
    <div className="splits">
      <div className="splits__bar">
        <span
          className="splits__label"
          data-hint={showKind ? t.splits.intervalsHint : t.splits.hint}
        >
          {t.splits.label}{" "}
          <i className="fa-regular fa-circle-question" aria-hidden="true" />
        </span>
        <div className="seg seg--sm" role="tablist" aria-label={t.splits.label}>
          {(
            [
              ...(hasIntervals
                ? ([
                    [
                      "intervals",
                      t.splits.intervals(
                        intervals.filter((s) => s.kind === "work").length,
                      ),
                    ],
                  ] as const)
                : []),
              ["1km", t.splits.per1],
              ["5km", t.splits.per5],
              ...(hasLaps
                ? ([["laps", t.splits.laps(track.laps.length)]] as const)
                : []),
            ] as [SplitMode, string][]
          ).map(([key, label]) => (
            <button
              key={key}
              type="button"
              role="tab"
              aria-selected={mode === key}
              className={`seg__btn${mode === key ? " is-active" : ""}`}
              onClick={() => setMode(key)}
            >
              {label}
            </button>
          ))}
        </div>
      </div>
      {totals.length > 0 && (
        <div className="splits__totals" data-hint={t.splits.kindTotalsHint}>
          <span className="splits__totals-label">
            {t.splits.kindTotalsLabel}{" "}
            <i className="fa-regular fa-circle-question" aria-hidden="true" />
          </span>
          <div className="splits__totals-list">
            {totals.map(({ kind, n, time }) => (
              <span
                key={kind}
                className="splits__total-chip"
                style={{ color: KIND_COLORS[kind] }}
              >
                <b>{t.splits.kinds[kind]}</b>
                <span>{t.splits.kindTotal(n, fmt.clock(time))}</span>
              </span>
            ))}
          </div>
        </div>
      )}
      {splits.length === 0 ? (
        <p className="splits__empty">{t.splits.empty}</p>
      ) : (
        <div className="table-scroll">
          <table className="splits__table">
            <thead>
              <tr>
                <th>{mode === "laps" ? t.splits.hLap : t.splits.hN}</th>
                {showKind && <th>{t.splits.hCategory}</th>}
                <th>{t.splits.hDist}</th>
                <th data-hint={t.splits.hTime.hint}>{t.splits.hTime.label}</th>
                <th
                  data-hint={pace ? t.splits.hPace.hint : t.splits.hSpeed.hint}
                >
                  {pace ? t.splits.hPace.label : t.splits.hSpeed.label}
                </th>
                <th data-hint={t.splits.hHr.hint}>{t.splits.hHr.label}</th>
                <th data-hint={t.splits.hCadence.hint}>
                  {t.splits.hCadence.label}
                </th>
                <th data-hint={t.splits.hAscent.hint}>
                  {t.splits.hAscent.label}
                </th>
              </tr>
            </thead>
            <tbody>
              {splits.map((s) => (
                <tr key={s.n}>
                  <td>{s.n}</td>
                  {showKind && (
                    <td>
                      <span
                        className="splits__kind"
                        style={{
                          color: s.kind ? KIND_COLORS[s.kind] : undefined,
                        }}
                      >
                        {s.kind ? t.splits.kinds[s.kind] : "—"}
                      </span>
                    </td>
                  )}
                  <td>{fmt.distance(s.distance)}</td>
                  <td>{fmt.clock(s.time)}</td>
                  <td>
                    {pace ? fmt.paceBare(s.avgSpeed) : fmt.num1(s.avgSpeed)}
                  </td>
                  <td>{s.avgHr ? Math.round(s.avgHr) : "—"}</td>
                  <td>{s.avgCadence ? Math.round(s.avgCadence) : "—"}</td>
                  <td>{s.ascent !== undefined ? Math.round(s.ascent) : "—"}</td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
};

const DetailStat = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) =>
  value === "—" ? null : (
    <div className="track-detail__stat" data-hint={hint}>
      <small>
        {label}{" "}
        <i className="fa-regular fa-circle-question" aria-hidden="true" />
      </small>
      <b>{value}</b>
    </div>
  );

export const TrackDetails = ({ track }: { track: Track }) => {
  const { t, fmt } = useI18n();
  const s = track.summary;
  const pace = isPaceSport(s.sport);
  const d = t.details;
  return (
    <div className="track-row__details">
      <div className="track-detail__grid">
        <DetailStat
          label={d.elapsed.label}
          value={fmt.duration(s.elapsed)}
          hint={d.elapsed.hint}
        />
        <DetailStat
          label={d.moving.label}
          value={fmt.duration(s.moving)}
          hint={d.moving.hint}
        />
        <DetailStat
          label={pace ? d.bestPace.label : d.maxSpeed.label}
          value={pace ? fmt.paceBare(s.maxSpeed) : fmt.num1(s.maxSpeed)}
          hint={pace ? d.bestPace.hint : d.maxSpeed.hint}
        />
        <DetailStat
          label={d.hr.label}
          value={
            s.avgHr
              ? `${d.avg} ${Math.round(s.avgHr)}${s.maxHr ? ` · ${d.max} ${Math.round(s.maxHr)}` : ""}${
                  s.minHr ? ` · ${d.min} ${Math.round(s.minHr)}` : ""
                }`
              : "—"
          }
          hint={d.hr.hint}
        />
        <DetailStat
          label={d.cadence.label}
          value={
            s.avgCadence
              ? `${d.avg} ${Math.round(s.avgCadence)}${
                  s.maxCadence ? ` · ${d.max} ${Math.round(s.maxCadence)}` : ""
                }`
              : "—"
          }
          hint={d.cadence.hint}
        />
        <DetailStat
          label={d.power.label}
          value={
            s.avgPower
              ? `${d.avg} ${Math.round(s.avgPower)}${s.maxPower ? ` · ${d.max} ${Math.round(s.maxPower)}` : ""}`
              : "—"
          }
          hint={d.power.hint}
        />
        <DetailStat
          label={d.stride.label}
          value={s.avgStride ? fmt.num1(s.avgStride) : "—"}
          hint={d.stride.hint}
        />
        <DetailStat
          label={d.descent.label}
          value={s.descent !== undefined ? String(Math.round(s.descent)) : "—"}
          hint={d.descent.hint}
        />
        <DetailStat
          label={d.temp.label}
          value={s.avgTemp !== undefined ? fmt.num1(s.avgTemp) : "—"}
          hint={d.temp.hint}
        />
        <DetailStat
          label={d.te.label}
          value={
            s.trainingEffect !== undefined
              ? `${d.aerobic} ${fmt.num1(s.trainingEffect)}${
                  s.anaerobicTrainingEffect !== undefined
                    ? ` · ${d.anaerobic} ${fmt.num1(s.anaerobicTrainingEffect)}`
                    : ""
                }`
              : "—"
          }
          hint={d.te.hint}
        />
        <DetailStat
          label={d.vo2.label}
          value={s.vo2max !== undefined ? fmt.num1(s.vo2max) : "—"}
          hint={d.vo2.hint}
        />
        <DetailStat
          label={d.points.label}
          value={fmt.int(track.points.length)}
          hint={d.points.hint}
        />
      </div>
      <SplitsTable track={track} />
    </div>
  );
};

const RowMetric = ({
  label,
  value,
  hint,
}: {
  label: string;
  value: string;
  hint: string;
}) => (
  <span className="track-row__metric" data-hint={hint}>
    <small>{label}</small>
    <b>{value}</b>
  </span>
);

interface TrackRowProps {
  track: Track;
  t: Dict;
  fmt: Fmt;
  onOpen: (id: string) => void;
  onToggleVisible: (id: string) => void;
  onRemove: (id: string) => void;
}

const TrackRow = memo(function TrackRow({
  track,
  t,
  fmt,
  onOpen,
  onToggleVisible,
  onRemove,
}: TrackRowProps) {
  const s = track.summary;
  const pace = isPaceSport(s.sport);
  return (
    /* ВАЖНО: без data-reveal — reveal-observer пишет класс is-visible прямо
       в DOM, а React при смене className (toggle глаза) его стирает,
       и строка навсегда проваливается в opacity:0. */
    <div className={`track-row glass${track.visible ? "" : " is-hidden"}`}>
      <div className="track-row__top">
        <button
          type="button"
          className="track-row__main"
          onClick={() => onOpen(track.id)}
        >
          <span
            className="track-row__dot"
            style={{ background: track.color }}
            aria-hidden="true"
          />
          <span
            className="track-row__icon"
            aria-hidden="true"
            style={{ color: track.color }}
          >
            <i
              className={`fa-solid ${SPORT_ICONS[s.sport ?? ""] ?? "fa-location-dot"}`}
            />
          </span>
          <span className="track-row__title">
            <b>{track.fileName}</b>
            <small>
              {sportLabel(t, s.sport)} · {fmt.date(s.startTime)}
              {!track.hasGps && ` · ${t.row.noGps}`}
              {!track.visible && (
                <span className="track-row__badge-inline">
                  {" "}
                  · {t.row.badge}
                </span>
              )}
            </small>
          </span>
          <span className="track-row__metrics">
            <RowMetric
              label={t.row.distance.label}
              value={fmt.distance(s.distance)}
              hint={t.row.distance.hint}
            />
            <RowMetric
              label={t.row.time.label}
              value={fmt.clock(s.moving)}
              hint={t.row.time.hint}
            />
            <RowMetric
              label={pace ? t.row.pace.label : t.row.speed.label}
              value={pace ? fmt.pace(s.avgSpeed) : fmt.speed(s.avgSpeed)}
              hint={pace ? t.row.pace.hint : t.row.speed.hint}
            />
            <RowMetric
              label={t.row.hr.label}
              value={s.avgHr ? `${Math.round(s.avgHr)} ${t.units.bpm}` : "—"}
              hint={t.row.hr.hint}
            />
            <RowMetric
              label={t.row.ascent.label}
              value={
                s.ascent !== undefined
                  ? `${Math.round(s.ascent)} ${t.units.m}`
                  : "—"
              }
              hint={t.row.ascent.hint}
            />
            <RowMetric
              label={t.row.calories.label}
              value={
                s.calories ? `${Math.round(s.calories)} ${t.units.kcal}` : "—"
              }
              hint={t.row.calories.hint}
            />
          </span>
          <i
            className="fa-solid fa-chevron-right track-row__chevron"
            aria-hidden="true"
          />
        </button>
        <div className="track-row__actions">
          <button
            type="button"
            className="icon-btn"
            title={track.visible ? t.row.hide : t.row.show}
            aria-label={track.visible ? t.row.hide : t.row.show}
            aria-pressed={!track.visible}
            onClick={() => onToggleVisible(track.id)}
          >
            <i
              className={`fa-solid ${track.visible ? "fa-eye" : "fa-eye-slash"}`}
              aria-hidden="true"
            />
          </button>
          <button
            type="button"
            className="icon-btn icon-btn--danger"
            title={t.row.remove}
            aria-label={t.row.remove}
            onClick={() => onRemove(track.id)}
          >
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>
      </div>
    </div>
  );
});

const SORT_KEYS: TrackSortKey[] = [
  "date",
  "name",
  "sport",
  "distance",
  "duration",
  "pace",
];

/** Оценка высоты строки для виртуализации (строки одинаковой высоты). */
const ROW_ESTIMATE = 108;
/** Порог, после которого включаем windowed-рендер. */
const VIRTUAL_THRESHOLD = 24;

/** Список загруженных треков: метрики, видимость, отсечки, удаление, сортировка. */
export const TrackList = () => {
  const { t, fmt } = useI18n();
  const { tracks, toggleTrack, setAllVisible, removeTrack, clearTracks } = useTracks();
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [sortKey, setSortKey] = useState<TrackSortKey>("date");
  const [sortDir, setSortDir] = useState<1 | -1>(-1); // date desc by default

  const sorted = useMemo(
    () => [...tracks].sort((a, b) => compareTracks(a, b, sortKey, sortDir)),
    [tracks, sortKey, sortDir],
  );
  const allVisible = tracks.length > 0 && tracks.every((tr) => tr.visible);

  const onOpen = (id: string) => setSelectedId(id);
  const selectedTrack = selectedId
    ? tracks.find((tr) => tr.id === selectedId) ?? null
    : null;

  const onSort = (key: TrackSortKey) => {
    if (key === sortKey) setSortDir((d) => (d === 1 ? -1 : 1));
    else {
      setSortKey(key);
      // Дата/имя — обычно новые сверху; метрики — большие сверху.
      setSortDir(key === "name" || key === "sport" ? 1 : -1);
    }
  };

  const useVirtual = sorted.length >= VIRTUAL_THRESHOLD;
  const listHeight = Math.min(
    720,
    Math.max(320, Math.min(sorted.length, 10) * ROW_ESTIMATE),
  );

  const renderRow = (track: Track) => (
    <TrackRow
      key={track.id}
      track={track}
      t={t}
      fmt={fmt}
      onOpen={onOpen}
      onToggleVisible={toggleTrack}
      onRemove={removeTrack}
    />
  );

  return (
    <div className="track-list-wrap">
      <div className="track-list__toolbar">
        <span className="track-list__sort-label">{t.sections.tracks.sort}</span>
        <div
          className="seg seg--sm track-list__sort"
          role="group"
          aria-label={t.sections.tracks.sort}
        >
          {SORT_KEYS.map((key) => {
            const active = sortKey === key;
            return (
              <button
                key={key}
                type="button"
                className={`seg__btn${active ? " is-active" : ""}`}
                onClick={() => onSort(key)}
                title={t.sections.tracks.sortKeys[key]}
              >
                {t.sections.tracks.sortKeys[key]}
                {active && (
                  <i
                    className={`fa-solid fa-arrow-${sortDir === 1 ? "up" : "down"}`}
                    aria-hidden="true"
                    style={{ marginLeft: 4, fontSize: "0.7em" }}
                  />
                )}
              </button>
            );
          })}
        </div>
        <span className="track-list__count">{sorted.length}</span>
        <button
          type="button"
          className="btn btn--ghost btn--xs"
          onClick={clearTracks}
        >
          <i className="fa-solid fa-broom" aria-hidden="true" />
          {t.sections.tracks.clear}
        </button>
        {sorted.length > 1 && (
          <button
            type="button"
            className="btn btn--ghost btn--xs"
            onClick={() => setAllVisible(!allVisible)}
            title={
              allVisible ? t.sections.tracks.hideAll : t.sections.tracks.showAll
            }
          >
            <i
              className={`fa-solid ${allVisible ? "fa-eye-slash" : "fa-eye"}`}
              aria-hidden="true"
            />
            {allVisible ? t.sections.tracks.hideAll : t.sections.tracks.showAll}
          </button>
        )}
      </div>

      {useVirtual ? (
        <VirtualList
          className="track-list track-list--virtual"
          items={sorted}
          estimateSize={ROW_ESTIMATE}
          height={listHeight}
          getKey={(tr) => tr.id}
          renderItem={(track) => renderRow(track)}
          ariaLabel={t.sections.tracks.title}
        />
      ) : (
        <div className="track-list">
          {sorted.map((track) => renderRow(track))}
        </div>
      )}

      <TrackDetailModal track={selectedTrack} onClose={() => setSelectedId(null)} />
    </div>
  );
};
