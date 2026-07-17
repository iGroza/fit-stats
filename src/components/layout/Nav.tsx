import { useState } from 'react';
import type { MouseEvent } from 'react';
import { useToast } from '../common/Toast';
import { NAV_SECTIONS, APP_NAME } from '../../config';
import { exportTracksPng } from '../../fit/exportPng';
import { exportTracksXlsx } from '../../fit/exportXlsx';
import { useScrollSpy } from '../../hooks/useScrollSpy';
import { useSmoothSectionScroll } from '../../hooks/useSmoothSectionScroll';
import { useI18n } from '../../i18n';
import { useTracks } from '../../state/TracksContext';
import './Nav.css';

export const Nav = () => {
  const { t, fmt, locale, setLocale } = useI18n();
  const toast = useToast();
  const [menuOpen, setMenuOpen] = useState(false);
  const [exporting, setExporting] = useState(false);
  const [pngBusy, setPngBusy] = useState(false);
  const onAnchor = useSmoothSectionScroll();
  const { tracks, visible } = useTracks();
  const hasTracks = tracks.length > 0;

  const active = useScrollSpy(NAV_SECTIONS);

  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => {
    onAnchor(event);
    setMenuOpen(false);
  };

  const handleExport = async () => {
    if (!visible.length || exporting) return;
    setExporting(true);
    try {
      await exportTracksXlsx(visible, t, fmt);
      toast.success(t.toasts.exportExcelTitle);
    } catch {
      toast.error(t.toasts.exportExcelError);
    } finally {
      setExporting(false);
    }
  };

  const handlePng = async () => {
    if (!visible.length || pngBusy) return;
    setPngBusy(true);
    try {
      await exportTracksPng(visible, t, fmt);
      toast.success(t.toasts.exportPngTitle);
    } catch {
      toast.error(t.toasts.exportPngError);
    } finally {
      setPngBusy(false);
    }
  };

  return (
    <header className="pill-nav">
      <div
        className={`pill-nav__sheet${menuOpen && hasTracks ? ' is-open' : ''}`}
        id="pill-nav-menu"
        aria-hidden={!(menuOpen && hasTracks)}
      >
        {NAV_SECTIONS.map((id) => (
          <a
            key={id}
            href={`#${id}`}
            className={`pill-nav__sheet-link${active === id ? ' is-active' : ''}`}
            onClick={handleClick}
            tabIndex={menuOpen && hasTracks ? 0 : -1}
          >
            {t.nav.sections[id]}
          </a>
        ))}
      </div>

      <nav className="pill-nav__bar" aria-label={t.nav.aria}>
        <a href="#upload" className="pill-nav__brand" onClick={handleClick} aria-label={`${APP_NAME} — ${t.nav.toTop}`}>
          <span className="pill-nav__mark" aria-hidden="true">
            <i className="fa-solid fa-route" />
          </span>
          <span className="pill-nav__name">{APP_NAME}</span>
        </a>

        {/* Разделы существуют только когда есть треки — до этого не показываем. */}
        <div className={`pill-nav__links pill-nav__appear${hasTracks ? ' is-shown' : ''}`}>
          {NAV_SECTIONS.map((id) => (
            <a
              key={id}
              href={`#${id}`}
              className={`pill-nav__link${active === id ? ' is-active' : ''}`}
              aria-current={active === id ? 'true' : undefined}
              onClick={handleClick}
              tabIndex={hasTracks ? 0 : -1}
            >
              {t.nav.sections[id]}
            </a>
          ))}
        </div>

        <button
          type="button"
          className={`btn btn--ghost btn--sm pill-nav__export pill-nav__appear${hasTracks ? ' is-shown' : ''}`}
          onClick={handleExport}
          disabled={!visible.length || exporting}
          tabIndex={hasTracks ? 0 : -1}
          title={t.nav.exportTitle}
        >
          <i
            className={`fa-solid ${exporting ? 'fa-spinner fa-spin' : 'fa-file-excel'}`}
            style={{ color: '#21a366' }}
            aria-hidden="true"
          />
          {exporting ? t.nav.exporting : t.nav.export}
        </button>

        {/* После загрузки треков CTA превращается в скачивание PNG-отчёта. */}
        {hasTracks ? (
          <button
            type="button"
            className="btn btn--primary btn--sm pill-nav__cta"
            onClick={handlePng}
            disabled={!visible.length || pngBusy}
            title={t.nav.downloadPngTitle}
          >
            <i
              className={`fa-solid ${pngBusy ? 'fa-spinner fa-spin' : 'fa-image'}`}
              aria-hidden="true"
            />
            {pngBusy ? t.nav.exporting : t.nav.downloadPng}
          </button>
        ) : (
          <a href="#upload" className="btn btn--primary btn--sm pill-nav__cta" onClick={handleClick}>
            {t.nav.upload}
            <i className="fa-solid fa-arrow-up" aria-hidden="true" />
          </a>
        )}

        <button
          type="button"
          className="pill-nav__lang"
          aria-label={t.langLabel}
          title={t.langLabel}
          onClick={() => setLocale(locale === 'ru' ? 'en' : 'ru')}
        >
          {locale === 'ru' ? 'EN' : 'RU'}
        </button>


        <button
          type="button"
          className={`pill-nav__burger pill-nav__appear${hasTracks ? ' is-shown' : ''}${menuOpen ? ' is-open' : ''}`}
          aria-label={menuOpen ? t.nav.menuClose : t.nav.menuOpen}
          aria-expanded={menuOpen}
          aria-controls="pill-nav-menu"
          onClick={() => setMenuOpen((open) => !open)}
        >
          <span className="pill-nav__burger-box" aria-hidden="true">
            <span className="pill-nav__burger-line" />
            <span className="pill-nav__burger-line" />
            <span className="pill-nav__burger-line" />
          </span>
        </button>
      </nav>
    </header>
  );
};
