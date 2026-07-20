import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react';
import type { ReactNode } from 'react';
import { DICTS } from './dict';
import type { Dict, Locale } from './dict';

const STORAGE_KEY = 'fit-stats-locale';

/* ───────────────────────── Форматтеры под локаль ──────────────────────── */

export interface Fmt {
  distance: (m: number) => string;
  duration: (sec: number) => string;
  clock: (sec: number) => string;
  speed: (kmh?: number) => string;
  /** Темп мин/км из скорости км/ч (с суффиксом /км). */
  pace: (kmh?: number) => string;
  /** Темп без суффикса — для таблиц с единицей в заголовке. */
  paceBare: (kmh?: number) => string;
  date: (d?: Date) => string;
  day: (ms?: number) => string;
  num1: (v?: number) => string;
  int: (v: number) => string;
}

export const makeFmt = (d: Dict): Fmt => {
  const u = d.units;
  const paceBare = (kmh?: number): string => {
    if (!kmh || kmh <= 0) return '—';
    // Округляем ВСЕ секунды сразу, иначе 419.99 с/км даёт «6:60» вместо «7:00».
    const total = Math.round(3600 / kmh);
    const m = Math.floor(total / 60);
    const s = total % 60;
    return `${m}:${String(s).padStart(2, '0')}`;
  };
  return {
    distance: (m) =>
      m >= 1000
        ? `${(m / 1000).toLocaleString(d.locale, { maximumFractionDigits: 1 })} ${u.km}`
        : `${Math.round(m)} ${u.m}`,
    duration: (sec) => {
      const s = Math.round(sec);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      if (h > 0) return `${h} ${u.h} ${String(m).padStart(2, '0')} ${u.min}`;
      return `${m} ${u.min} ${String(s % 60).padStart(2, '0')} ${u.s}`;
    },
    clock: (sec) => {
      const s = Math.round(sec);
      const h = Math.floor(s / 3600);
      const m = Math.floor((s % 3600) / 60);
      const rest = `${String(m).padStart(2, '0')}:${String(s % 60).padStart(2, '0')}`;
      return h > 0 ? `${h}:${rest}` : rest;
    },
    speed: (kmh) =>
      kmh === undefined
        ? '—'
        : `${kmh.toLocaleString(d.locale, { maximumFractionDigits: 1 })} ${u.kmh}`,
    pace: (kmh) => (paceBare(kmh) === '—' ? '—' : `${paceBare(kmh)} ${u.perKm}`),
    paceBare,
    date: (dt) =>
      dt
        ? dt.toLocaleString(d.locale, {
            day: 'numeric',
            month: 'short',
            year: 'numeric',
            hour: '2-digit',
            minute: '2-digit',
          })
        : '—',
    day: (ms) =>
      ms
        ? new Date(ms).toLocaleDateString(d.locale, { day: 'numeric', month: 'short', year: 'numeric' })
        : '',
    num1: (v) => (v === undefined ? '—' : (Math.round(v * 10) / 10).toLocaleString(d.locale)),
    int: (v) => Math.round(v).toLocaleString(d.locale),
  };
};

/** Название вида спорта из FIT-профиля. */
export const sportLabel = (d: Dict, sport?: string): string =>
  (sport && d.sports[sport]) || sport || d.sports.generic;

/* ───────────────────────────── Провайдер ──────────────────────────────── */

interface I18nState {
  locale: Locale;
  setLocale: (l: Locale) => void;
  t: Dict;
  fmt: Fmt;
}

const Ctx = createContext<I18nState | null>(null);

export const useI18n = (): I18nState => {
  const ctx = useContext(Ctx);
  if (!ctx) throw new Error('useI18n must be used within <LocaleProvider>');
  return ctx;
};

export const LocaleProvider = ({ children }: { children: ReactNode }) => {
  // SSR/первый рендер — всегда ru (совпадает с пререндером), потом
  // подхватываем сохранённый выбор или язык браузера без гидрационных ошибок.
  const [locale, setLocaleState] = useState<Locale>('ru');
  const [splash, setSplash] = useState(false);

  useEffect(() => {
    const saved = localStorage.getItem(STORAGE_KEY);
    if (saved === 'ru' || saved === 'en') {
      setLocaleState(saved);
      return;
    }
    // Русский определяем по ВСЕМУ списку языков браузера: у многих система
    // на английском, но русский присутствует в navigator.languages.
    const langs = [...(navigator.languages ?? []), navigator.language];
    const hasRu = langs.some((l) => l?.toLowerCase().startsWith('ru'));
    setLocaleState(hasRu ? 'ru' : 'en');
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale === 'ru' ? 'ru-RU' : 'en';
  }, [locale]);

  // Смена языка под коротким splash-экраном — текст меняется незаметно.
  const setLocale = useCallback((l: Locale) => {
    setSplash(true);
    window.setTimeout(() => {
      setLocaleState(l);
      localStorage.setItem(STORAGE_KEY, l);
    }, 260);
    window.setTimeout(() => setSplash(false), 900);
  }, []);

  const value = useMemo(() => {
    const t = DICTS[locale];
    return { locale, setLocale, t, fmt: makeFmt(t) };
  }, [locale, setLocale]);

  return (
    <Ctx.Provider value={value}>
      {children}
      {splash && (
        <div className="locale-splash" aria-hidden="true">
          <span className="locale-splash__mark">
            <i className="fa-solid fa-route" />
          </span>
        </div>
      )}
    </Ctx.Provider>
  );
};
