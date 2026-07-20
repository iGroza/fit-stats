import { useEffect, useMemo, useState } from 'react';
import {
  CartesianGrid,
  Line,
  LineChart,
  ResponsiveContainer,
  Tooltip,
  XAxis,
  YAxis,
} from 'recharts';
import type { ChartAxis } from '../../fit/stats';
import { averageMetricSeries, hasMetric, metricSeries } from '../../fit/stats';
import { METRICS } from '../../fit/types';
import type { MetricDef, Track } from '../../fit/types';
import { useI18n } from '../../i18n';

interface ChartsProps {
  tracks: Track[];
  /** Пока парсятся файлы — не гоняем recharts на каждый батч. */
  busy?: boolean;
}

/** Свыше этого числа «каждый трек» автоматически переключается на среднее. */
const AUTO_AVG_THRESHOLD = 12;
/** Жёсткий лимит линий в режиме «каждый» — иначе recharts зависает. */
const MAX_EACH_SERIES = 20;

const AXIS_STYLE = { fill: '#686868', fontSize: 12, fontFamily: 'Geist, sans-serif' };
const GRID_COLOR = 'rgba(229, 229, 229, 0.07)';

const paceLabel = (v: number): string => {
  // Округляем общее число секунд, иначе 6.9998 мин/км печатает «6:60».
  const total = Math.round(v * 60);
  const m = Math.floor(total / 60);
  const s = total % 60;
  return `${m}:${String(s).padStart(2, '0')}`;
};

type ViewMode = 'each' | 'avg';

const MetricChart = ({
  metric,
  tracks,
  axis,
  view,
}: {
  metric: MetricDef;
  tracks: Track[];
  axis: ChartAxis;
  view: ViewMode;
}) => {
  const { t } = useI18n();
  const m = t.metrics[metric.key];
  const series = useMemo(() => {
    const withData = tracks.filter((tr) => hasMetric(tr, metric.key));
    if (view === 'avg' && withData.length > 1) {
      // Одна усреднённая линия по всем трекам.
      return [
        {
          id: 'avg',
          name: t.sections.charts.avgSeries,
          color: '#6b62f2',
          data: averageMetricSeries(withData, metric.key, axis),
        },
      ];
    }
    // Не рисуем сотни линий: берём самые длинные треки.
    const limited =
      withData.length > MAX_EACH_SERIES
        ? [...withData]
            .sort((a, b) => b.points.length - a.points.length)
            .slice(0, MAX_EACH_SERIES)
        : withData;
    return limited.map((tr) => ({
      id: tr.id,
      name: tr.fileName,
      color: tr.color,
      data: metricSeries(tr, metric.key, axis),
    }));
  }, [tracks, metric.key, axis, view, t]);
  if (!series.length || !series[0].data.length) return null;

  const isPace = metric.key === 'pace';
  const format = (v: number) => (isPace ? paceLabel(v) : String(v));
  const xUnit = axis === 'dist' ? t.units.km : t.units.min;

  return (
    <div className="chart-card glass">
      <div className="chart-card__head" data-hint={m.hint}>
        <span className="chart-card__icon" aria-hidden="true" style={{ color: metric.color }}>
          <i className={`fa-solid ${metric.icon}`} />
        </span>
        <b>{m.label}</b>
        <i className="fa-regular fa-circle-question chart-card__q" aria-hidden="true" />
        <span className="chart-card__unit">{m.unit}</span>
      </div>
      <div className="chart-card__plot">
        <ResponsiveContainer width="100%" height={260}>
          <LineChart margin={{ top: 8, right: 12, bottom: 4, left: -8 }}>
            <CartesianGrid stroke={GRID_COLOR} vertical={false} />
            <XAxis
              dataKey="x"
              type="number"
              domain={['dataMin', 'dataMax']}
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={{ stroke: GRID_COLOR }}
              tickFormatter={(v: number) => `${Math.round(v * 10) / 10}`}
              unit={` ${xUnit}`}
              allowDuplicatedCategory={false}
            />
            <YAxis
              tick={AXIS_STYLE}
              tickLine={false}
              axisLine={false}
              width={52}
              reversed={metric.reversed}
              domain={['auto', 'auto']}
              tickFormatter={format}
            />
            <Tooltip
              contentStyle={{
                background: 'rgba(20, 20, 22, 0.92)',
                border: '1px solid rgba(229, 229, 229, 0.12)',
                borderRadius: 12,
                fontFamily: 'Geist, sans-serif',
                fontSize: 13,
                color: '#e5e5e5',
              }}
              labelStyle={{ color: '#797979' }}
              labelFormatter={(v) => `${Math.round(Number(v) * 100) / 100} ${xUnit}`}
              formatter={(value: any, name: any) => [`${format(Number(value))} ${m.unit}`, name]}
            />
            {series.map(({ id, name, color, data }) => (
              <Line
                key={id}
                data={data}
                dataKey="y"
                name={name}
                stroke={color}
                strokeWidth={2}
                dot={false}
                isAnimationActive={false}
              />
            ))}
          </LineChart>
        </ResponsiveContainer>
      </div>
    </div>
  );
};

/** Графики по всем параметрам, найденным в видимых треках. */
export const Charts = ({ tracks, busy = false }: ChartsProps) => {
  const { t } = useI18n();
  const [axis, setAxis] = useState<ChartAxis>('dist');
  const [view, setView] = useState<ViewMode>(() =>
    tracks.length >= AUTO_AVG_THRESHOLD ? 'avg' : 'each'
  );

  // При росте числа треков переключаемся на «среднее», чтобы не рисовать сотни линий.
  useEffect(() => {
    if (tracks.length >= AUTO_AVG_THRESHOLD) setView('avg');
  }, [tracks.length]);

  const hasDistance = tracks.some((tr) => (tr.points[tr.points.length - 1]?.dist ?? 0) > 0);
  const available = METRICS.filter((m) => tracks.some((tr) => hasMetric(tr, m.key)));

  if (!available.length) return null;

  if (busy) {
    return (
      <div className="charts-busy glass">
        <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        <span>{t.sections.charts.busy}</span>
      </div>
    );
  }

  const effectiveView: ViewMode = tracks.length > 1 ? view : 'each';

  return (
    <>
      <div className="charts-toolbar">
        <span className="charts-toolbar__label">{t.sections.charts.axis}</span>
        <div className="seg" role="tablist" aria-label={t.sections.charts.axis}>
          <button
            type="button"
            role="tab"
            aria-selected={axis === 'dist'}
            className={`seg__btn${axis === 'dist' ? ' is-active' : ''}`}
            disabled={!hasDistance}
            onClick={() => setAxis('dist')}
          >
            <i className="fa-solid fa-route" aria-hidden="true" /> {t.sections.charts.axisDist}
          </button>
          <button
            type="button"
            role="tab"
            aria-selected={axis === 'time'}
            className={`seg__btn${axis === 'time' ? ' is-active' : ''}`}
            onClick={() => setAxis('time')}
          >
            <i className="fa-solid fa-clock" aria-hidden="true" /> {t.sections.charts.axisTime}
          </button>
        </div>

        {tracks.length > 1 && (
          <>
            <span className="charts-toolbar__label">{t.sections.charts.view}</span>
            <div className="seg" role="tablist" aria-label={t.sections.charts.view}>
              <button
                type="button"
                role="tab"
                aria-selected={effectiveView === 'each'}
                className={`seg__btn${effectiveView === 'each' ? ' is-active' : ''}`}
                onClick={() => setView('each')}
              >
                <i className="fa-solid fa-chart-line" aria-hidden="true" /> {t.sections.charts.viewEach}
              </button>
              <button
                type="button"
                role="tab"
                aria-selected={effectiveView === 'avg'}
                className={`seg__btn${effectiveView === 'avg' ? ' is-active' : ''}`}
                onClick={() => setView('avg')}
              >
                <i className="fa-solid fa-arrows-to-dot" aria-hidden="true" /> {t.sections.charts.viewAvg}
              </button>
            </div>
          </>
        )}
      </div>
      {effectiveView === 'each' && tracks.length > MAX_EACH_SERIES && (
        <p className="charts-note">{t.sections.charts.limited(MAX_EACH_SERIES, tracks.length)}</p>
      )}
      <div className="charts-grid">
        {available.map((m) => (
          <MetricChart
            key={m.key}
            metric={m}
            tracks={tracks}
            axis={hasDistance ? axis : 'time'}
            view={effectiveView}
          />
        ))}
      </div>
    </>
  );
};
