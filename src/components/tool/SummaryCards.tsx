import type { Totals } from '../../fit/stats';
import { useI18n } from '../../i18n';

interface SummaryCardsProps {
  totals: Totals;
  /** Все треки — бег/ходьба: показываем темп вместо скорости. */
  paceMode: boolean;
}

interface Stat {
  icon: string;
  /** Семантический цвет иконки. */
  color: string;
  label: string;
  value: string;
  sub?: string;
  hint: string;
}

/** Сетка glass-карточек с общей сводкой по всем видимым трекам. */
export const SummaryCards = ({ totals, paceMode }: SummaryCardsProps) => {
  const { t, fmt } = useI18n();
  const c = t.cards;

  const stats: Stat[] = [
    {
      icon: 'fa-route',
      color: '#6b62f2',
      label: c.distance.label,
      value: fmt.distance(totals.distance),
      sub: c.tracksCount(totals.count),
      hint: c.distance.hint,
    },
    {
      icon: 'fa-clock',
      color: '#5ec8f2',
      label: c.moving.label,
      value: fmt.duration(totals.moving),
      sub: c.withPauses(fmt.duration(totals.elapsed)),
      hint: c.moving.hint,
    },
    paceMode
      ? {
          icon: 'fa-stopwatch',
          color: '#f2a35e',
          label: c.pace.label,
          value: fmt.pace(totals.avgSpeed),
          sub: c.speedSub(fmt.speed(totals.avgSpeed)),
          hint: c.pace.hint,
        }
      : {
          icon: 'fa-gauge-high',
          color: '#f2a35e',
          label: c.speed.label,
          value: fmt.speed(totals.avgSpeed),
          sub: c.maxSub(fmt.speed(totals.maxSpeed)),
          hint: c.speed.hint,
        },
    {
      icon: 'fa-heart-pulse',
      color: '#f25e8a',
      label: c.hr.label,
      value: totals.avgHr ? `${Math.round(totals.avgHr)} ${t.units.bpm}` : '—',
      sub: totals.maxHr ? c.maxSub(`${Math.round(totals.maxHr)} ${t.units.bpm}`) : undefined,
      hint: c.hr.hint,
    },
    {
      icon: 'fa-mountain',
      color: '#4ade80',
      label: c.ascent.label,
      value: `${Math.round(totals.ascent)} ${t.units.m}`,
      sub: c.descentSub(`${Math.round(totals.descent)} ${t.units.m}`),
      hint: c.ascent.hint,
    },
    {
      icon: 'fa-fire-flame-curved',
      color: '#fb923c',
      label: c.calories.label,
      value: totals.calories ? `${fmt.int(totals.calories)} ${t.units.kcal}` : '—',
      hint: c.calories.hint,
    },
  ];

  return (
    <div className="stats-grid">
      {stats.map((s) => (
        <div key={s.label} className="stat glass" data-hint={s.hint}>
          <span className="stat__icon" aria-hidden="true" style={{ color: s.color }}>
            <i className={`fa-solid ${s.icon}`} />
          </span>
          <span className="stat__label">
            {s.label} <i className="fa-regular fa-circle-question" aria-hidden="true" />
          </span>
          <span className="stat__value">{s.value}</span>
          {s.sub && <span className="stat__sub">{s.sub}</span>}
        </div>
      ))}
    </div>
  );
};
