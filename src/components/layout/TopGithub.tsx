import { GITHUB_URL } from '../../config';
import { useI18n } from '../../i18n';

/** Ссылка на репозиторий — закреплена в правом верхнем углу сайта. */
export const TopGithub = () => {
  const { t } = useI18n();
  return (
    <a
      href={GITHUB_URL}
      target="_blank"
      rel="noopener noreferrer"
      className="top-github"
      aria-label={t.nav.github}
      title={t.nav.github}
    >
      <i className="fa-brands fa-github" aria-hidden="true" />
      <span>GitHub</span>
    </a>
  );
};
