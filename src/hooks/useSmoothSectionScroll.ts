import { useCallback, useEffect, useRef } from 'react';
import type { MouseEvent } from 'react';

const easeInOutCubic = (progress: number): number =>
  progress < 0.5
    ? 4 * progress * progress * progress
    : 1 - Math.pow(-2 * progress + 2, 3) / 2;

const clamp = (value: number, min: number, max: number): number =>
  Math.min(max, Math.max(min, value));

export const useSmoothSectionScroll = () => {
  const animationFrameRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (animationFrameRef.current !== null) {
        cancelAnimationFrame(animationFrameRef.current);
      }
    };
  }, []);

  return useCallback((event: MouseEvent<HTMLAnchorElement>) => {
    const href = event.currentTarget.getAttribute('href');
    if (!href || !href.startsWith('#')) {
      return;
    }

    const targetId = href.slice(1);
    const target = document.getElementById(targetId);
    if (!target) {
      return;
    }

    event.preventDefault();

    if (animationFrameRef.current !== null) {
      cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }

    // Навигация — плавающий pill внизу экрана, верхнего бара нет: достаточно
    // небольшого отступа сверху, чтобы секция не прилипала к краю.
    const headerOffset = 32;
    const startY = window.scrollY;
    const targetY = Math.max(0, target.getBoundingClientRect().top + startY - headerOffset);
    const distance = Math.abs(targetY - startY);

    if (distance < 2) {
      window.history.pushState(null, '', `#${targetId}`);
      return;
    }

    const prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    if (prefersReducedMotion) {
      window.scrollTo(0, targetY);
      window.history.pushState(null, '', `#${targetId}`);
      return;
    }

    const duration = clamp(distance * 0.6, 420, 1000);
    const startTime = performance.now();

    const step = (now: number) => {
      const elapsed = now - startTime;
      const progress = clamp(elapsed / duration, 0, 1);
      const easedProgress = easeInOutCubic(progress);
      const nextY = startY + (targetY - startY) * easedProgress;

      window.scrollTo(0, nextY);

      if (progress < 1) {
        animationFrameRef.current = requestAnimationFrame(step);
        return;
      }

      animationFrameRef.current = null;
      window.history.pushState(null, '', `#${targetId}`);
    };

    animationFrameRef.current = requestAnimationFrame(step);
  }, []);
};
