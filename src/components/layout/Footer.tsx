import type { MouseEvent } from 'react';
import { APP_NAME, TELEGRAM_URL } from '../../config';
import { useSmoothSectionScroll } from '../../hooks/useSmoothSectionScroll';
import { useI18n } from '../../i18n';

export const Footer = () => {
  const { t } = useI18n();
  const onAnchor = useSmoothSectionScroll();
  const handleClick = (event: MouseEvent<HTMLAnchorElement>) => onAnchor(event);
  const year = new Date().getFullYear();

  return (
    <footer className="footer">
      <div className="container">
        <div className="footer__grid">
          <div>
            <a href="#upload" className="footer__brand" onClick={handleClick}>
              {APP_NAME}
            </a>
            <p className="footer__tag">{t.footer.tagline}</p>
            <a
              href={TELEGRAM_URL}
              target="_blank"
              rel="noopener noreferrer"
              className="social-pill"
              style={{ marginTop: 'var(--sp-20)' }}
            >
              <i className="fa-brands fa-telegram" style={{ color: '#2aabee' }} aria-hidden="true" />
              @igroza
            </a>
          </div>

          <div className="footer__col">
            <h4>{t.footer.formatTitle}</h4>
            <span className="footer__link">{t.footer.formatLine1}</span>
            <span className="footer__link">{t.footer.formatLine2}</span>
          </div>
        </div>

        <div className="footer__bottom">
          <span>© {year} {APP_NAME}</span>
          <span className="footer__disclaimer">{t.footer.privacy}</span>
        </div>
      </div>
    </footer>
  );
};
