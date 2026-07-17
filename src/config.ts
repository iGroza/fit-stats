/**
 * FIT Stats — единый источник правды по данным приложения.
 *
 * Инструмент полностью работает в браузере: .fit-файлы никуда не
 * отправляются, парсинг и вычисления выполняются локально.
 * Все переводимые строки — в src/i18n/dict.ts.
 */

export const SITE_URL = 'https://fit.igroza.su';

// TODO(owner): заменить на реальный репозиторий.
export const GITHUB_URL = 'https://github.com/igroza/fit-tracker';

export const TELEGRAM_URL = 'https://t.me/igroza';

/** Название бренда — не переводится. */
export const APP_NAME = 'FIT Stats';

/** id секций одностраничника; подписи — t.nav.sections[id]. */
export type SectionId = 'tracks' | 'summary' | 'map' | 'charts';
export const NAV_SECTIONS: SectionId[] = ['tracks', 'summary', 'map', 'charts'];

/** Палитра треков — индиго как ведущий акцент, дальше спектр Dimension. */
export const TRACK_COLORS = [
  '#6b62f2',
  '#4ade80',
  '#5ec8f2',
  '#f2a35e',
  '#f25e8a',
  '#e0d75e',
  '#a78bfa',
  '#34d399',
  '#f47272',
  '#62b6f2',
] as const;
