import type { HrZone } from '../../fit/stats';
import { HR_ZONE_COLORS } from '../../fit/stats';
import { useI18n } from '../../i18n';

interface HrZonesProps {
  zones: HrZone[];
  /** Переопределить заголовок (по умолчанию — из словаря). */
  title?: string;
}

/**
 * Зоны сердечного ритма: 5 полос (от старшей к младшей, как на часах) с
 * диапазоном пульса, долей и временем в зоне.
 */
export const HrZones = ({ zones, title }: HrZonesProps) => {
  const { t, fmt } = useI18n();
  const total = zones.reduce((sum, z) => sum + z.time, 0) || 1;

  return (
    <div className="hr-zones glass" data-hint={t.hrZones.hint}>
      <div className="hr-zones__title">
        {title ?? t.hrZones.title}{' '}
        <i className="fa-regular fa-circle-question" aria-hidden="true" />
      </div>
      <div className="hr-zones__list">
        {[...zones].reverse().map((z) => {
          // Доля округляется вниз — совпадает с отображением устройства.
          const pct = Math.floor((z.time / total) * 100);
          const color = HR_ZONE_COLORS[z.zone - 1];
          return (
            <div className="hr-zone" key={z.zone}>
              <div className="hr-zone__top">
                <b className="hr-zone__name" style={{ color }}>
                  {t.hrZones.zone(z.zone)}
                </b>
                <span className="hr-zone__pct">{pct}%</span>
                <span className="hr-zone__time">{fmt.clock(z.time)}</span>
              </div>
              <small className="hr-zone__range">
                {z.min}–{z.max} {t.units.bpm}
              </small>
              <div className="hr-zone__bar">
                <div
                  className="hr-zone__fill"
                  style={{ width: `${pct}%`, background: color }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
};
