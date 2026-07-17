import { useEffect, useLayoutEffect, useRef, useState } from 'react';

/* useLayoutEffect ругается при SSR-пререндере — на сервере он не нужен. */
const useIsoLayoutEffect = typeof window !== 'undefined' ? useLayoutEffect : useEffect;

interface HintState {
  text: string;
  /** Центр элемента по X (viewport). */
  x: number;
  /** Верх/низ элемента (viewport). */
  top: number;
  bottom: number;
  below: boolean;
}

/**
 * Глобальный слой тултипов для [data-hint]: единственный fixed-элемент
 * поверх всего UI. В отличие от CSS ::after не обрезается overflow:hidden
 * (гармошка треков, модалки) и не уходит за край экрана.
 */
export const HintLayer = () => {
  const [hint, setHint] = useState<HintState | null>(null);
  const ref = useRef<HTMLDivElement>(null);
  const currentEl = useRef<Element | null>(null);

  useEffect(() => {
    const show = (el: HTMLElement) => {
      const text = el.getAttribute('data-hint');
      if (!text) return;
      const rect = el.getBoundingClientRect();
      setHint({
        text,
        x: rect.left + rect.width / 2,
        top: rect.top,
        bottom: rect.bottom,
        below: rect.top < 140, // сверху мало места — показываем под элементом
      });
    };
    const hide = () => {
      currentEl.current = null;
      setHint(null);
    };

    const onOver = (e: Event) => {
      const el = (e.target as Element | null)?.closest?.('[data-hint]') ?? null;
      if (el === currentEl.current) return;
      currentEl.current = el;
      if (el instanceof HTMLElement) show(el);
      else setHint(null);
    };

    document.addEventListener('mouseover', onOver, { passive: true });
    document.addEventListener('focusin', onOver);
    window.addEventListener('scroll', hide, { passive: true, capture: true });
    window.addEventListener('resize', hide, { passive: true });
    return () => {
      document.removeEventListener('mouseover', onOver);
      document.removeEventListener('focusin', onOver);
      window.removeEventListener('scroll', hide, { capture: true } as EventListenerOptions);
      window.removeEventListener('resize', hide);
    };
  }, []);

  // Прижимаем тултип к краям вьюпорта после рендера.
  useIsoLayoutEffect(() => {
    const el = ref.current;
    if (!el || !hint) return;
    const w = el.offsetWidth;
    const half = w / 2;
    const pad = 10;
    let left = hint.x;
    if (left - half < pad) left = pad + half;
    if (left + half > window.innerWidth - pad) left = window.innerWidth - pad - half;
    el.style.left = `${left}px`;
  }, [hint]);

  if (!hint) return null;

  return (
    <div
      ref={ref}
      className={`hint-pop${hint.below ? ' hint-pop--below' : ''}`}
      style={{
        left: hint.x,
        top: hint.below ? hint.bottom + 10 : undefined,
        bottom: hint.below ? undefined : window.innerHeight - hint.top + 10,
      }}
      role="tooltip"
    >
      {hint.text}
    </div>
  );
};
