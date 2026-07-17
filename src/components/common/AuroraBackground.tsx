import { useEffect, useRef } from 'react';
import './AuroraBackground.css';

/**
 * Живой атмосферный фон (Dimension): медленно дрейфующие индиго-«северные
 * сияния» + интерактивный glow, следующий за курсором. Индиго — единственный
 * акцент, используется только как мягкое свечение (по DESIGN.md).
 *
 * Перф: курсорный glow обновляется через CSS-переменные внутри rAF (без ре-рендера
 * React). При prefers-reduced-motion дрейф и курсор отключаются — остаётся
 * статичная атмосфера.
 */
export const AuroraBackground = () => {
  const ref = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    const el = ref.current;
    if (!el) {
      return;
    }
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    if (window.matchMedia('(pointer: coarse)').matches) {
      // На тач-устройствах курсорный glow не нужен — оставляем дрейф из CSS.
      return;
    }

    let raf = 0;
    let targetX = window.innerWidth / 2;
    let targetY = window.innerHeight * 0.32;
    let x = targetX;
    let y = targetY;

    const onMove = (e: PointerEvent) => {
      targetX = e.clientX;
      targetY = e.clientY;
      if (!raf) {
        raf = requestAnimationFrame(loop);
      }
    };

    const loop = () => {
      x += (targetX - x) * 0.08;
      y += (targetY - y) * 0.08;
      el.style.setProperty('--mx', `${x.toFixed(1)}px`);
      el.style.setProperty('--my', `${y.toFixed(1)}px`);
      if (Math.abs(targetX - x) > 0.5 || Math.abs(targetY - y) > 0.5) {
        raf = requestAnimationFrame(loop);
      } else {
        raf = 0;
      }
    };

    el.classList.add('aurora--interactive');
    window.addEventListener('pointermove', onMove, { passive: true });
    return () => {
      window.removeEventListener('pointermove', onMove);
      cancelAnimationFrame(raf);
    };
  }, []);

  return (
    <div className="aurora" ref={ref} aria-hidden="true">
      <span className="aurora__blob aurora__blob--1" />
      <span className="aurora__blob aurora__blob--2" />
      <span className="aurora__blob aurora__blob--3" />
      <span className="aurora__cursor" />
      <span className="aurora__grain" />
    </div>
  );
};
