import { useMemo } from 'react';
import { JsonLd } from '../components/common/JsonLd';
import { SectionHeader } from '../components/common/SectionHeader';
import { AnimatedHeading } from '../components/common/AnimatedHeading';
import { Dropzone } from '../components/tool/Dropzone';
import { History } from '../components/tool/History';
import { SummaryCards } from '../components/tool/SummaryCards';
import { HrZones } from '../components/tool/HrZones';
import { TrackMap } from '../components/tool/TrackMap';
import { Charts } from '../components/tool/Charts';
import { TrackList } from '../components/tool/TrackList';
import { useRevealOnScroll } from '../hooks/useRevealOnScroll';
import { APP_NAME, SITE_URL } from '../config';
import { aggregateHrZones, computeTotals, isPaceSport } from '../fit/stats';
import { useI18n } from '../i18n';
import { useTracks } from '../state/TracksContext';

const FEATURE_ICONS = [
  { icon: 'fa-file-arrow-up', color: '#6b62f2' },
  { icon: 'fa-map-location-dot', color: '#5ec8f2' },
  { icon: 'fa-chart-line', color: '#4ade80' },
  { icon: 'fa-shield-halved', color: '#f2a35e' },
];

export const HomePage = () => {
  const { t } = useI18n();
  const { tracks, visible, busyCount, errors, addFiles } = useTracks();
  const busy = busyCount > 0;

  const totals = useMemo(() => computeTotals(visible), [visible]);
  const hrZones = useMemo(() => aggregateHrZones(visible), [visible]);
  const paceMode = visible.every((tr) => isPaceSport(tr.summary.sport));
  const hasTracks = tracks.length > 0;

  const appSchema = useMemo(
    () => ({
      '@context': 'https://schema.org',
      '@type': 'WebApplication',
      name: APP_NAME,
      description: t.hero.sub,
      url: `${SITE_URL}/`,
      applicationCategory: 'SportsApplication',
      operatingSystem: 'Any (browser)',
      offers: { '@type': 'Offer', price: '0', priceCurrency: 'RUB' },
    }),
    [t]
  );

  // Пере-сканируем reveal-узлы, когда появляются/исчезают секции с данными.
  useRevealOnScroll(tracks.length);

  return (
    <>
      <JsonLd data={appSchema} />

      {/* ── Hero + загрузка + история ───────────────────────────────── */}
      <section className="hero" id="upload">
        <div className="hero__dawn" aria-hidden="true" />
        <div className="container hero__inner">
          <div>
            <span className="eyebrow hero__eyebrow" data-reveal data-reveal-early>
              {t.hero.eyebrow}
            </span>
            <AnimatedHeading key={t.hero.title} as="h1" text={t.hero.title} className="heading hero__title" />
            <p className="hero__sub" data-reveal data-reveal-early data-reveal-delay="1">
              {t.hero.sub}
            </p>
            <div data-reveal data-reveal-early data-reveal-delay="2">
              <Dropzone onFiles={addFiles} busyCount={busyCount} />
              {errors.length > 0 && (
                <ul className="parse-errors" role="alert">
                  {errors.slice(0, 12).map((e) => {
                    const code = e.message as keyof typeof t.errors;
                    const translated = t.errors[code];
                    const text =
                      typeof translated === 'string' ? translated : e.message;
                    return (
                      <li key={`${e.fileName}-${e.message}`}>
                        <i className="fa-solid fa-triangle-exclamation" aria-hidden="true" />
                        <b>{e.fileName}</b>: {text}
                      </li>
                    );
                  })}
                  {errors.length > 12 && (
                    <li className="parse-errors__more">
                      {t.errors.more(errors.length - 12)}
                    </li>
                  )}
                </ul>
              )}
              <History />
            </div>
          </div>
          <div className="hero__features-grid" data-reveal data-reveal-early data-reveal-delay="2">
            {t.hero.features.map((f, i) => (
              <div key={f.title} className="feature glass">
                <span className="feature__icon" aria-hidden="true" style={{ color: FEATURE_ICONS[i].color }}>
                  <i className={`fa-solid ${FEATURE_ICONS[i].icon}`} />
                </span>
                <b>{f.title}</b>
                <p>{f.text}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {hasTracks && (
        <>
          {/* ── Треки: сначала выбираем, что участвует в анализе ────── */}
          <section className="section" id="tracks">
            <div className="container">
              <div className="section-toolbar">
                <SectionHeader
                  eyebrow={t.sections.tracks.eyebrow}
                  title={t.sections.tracks.title}
                  lead={t.sections.tracks.lead}
                />
              </div>
              <TrackList />
            </div>
          </section>

          {/* ── Сводка ─────────────────────────────────────────────── */}
          <section className="section" id="summary">
            <div className="container">
              <SectionHeader
                eyebrow={t.sections.summary.eyebrow}
                title={t.sections.summary.title}
                lead={t.sections.summary.lead(visible.length, tracks.length)}
              />
              <SummaryCards totals={totals} paceMode={paceMode} />
              {hrZones && <HrZones zones={hrZones} />}
            </div>
          </section>

          {/* ── Карта ──────────────────────────────────────────────── */}
          <section className="section" id="map">
            <div className="container">
              <SectionHeader
                eyebrow={t.sections.map.eyebrow}
                title={t.sections.map.title}
                lead={t.sections.map.lead}
              />
              <TrackMap tracks={tracks} busy={busy} />
            </div>
          </section>

          {/* ── Графики ────────────────────────────────────────────── */}
          <section className="section" id="charts">
            <div className="container">
              <SectionHeader
                eyebrow={t.sections.charts.eyebrow}
                title={t.sections.charts.title}
                lead={t.sections.charts.lead}
              />
              <Charts tracks={visible} busy={busy} />
            </div>
          </section>
        </>
      )}
    </>
  );
};
