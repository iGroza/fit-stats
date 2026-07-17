import { useEffect, useState } from 'react';

/**
 * Возвращает id секции, находящейся в фокусе вьюпорта (scroll-spy для навбара).
 * Использует IntersectionObserver: активна последняя пересёкшая верхнюю зону секция.
 */
export const useScrollSpy = (ids: string[], offset = 84): string => {
  const [active, setActive] = useState<string>(ids[0] ?? '');

  useEffect(() => {
    if (typeof IntersectionObserver === 'undefined') {
      return;
    }
    const sections = ids
      .map((id) => document.getElementById(id))
      .filter((el): el is HTMLElement => Boolean(el));
    if (sections.length === 0) {
      return;
    }

    const visible = new Map<string, number>();

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting) {
            visible.set(entry.target.id, entry.intersectionRatio);
          } else {
            visible.delete(entry.target.id);
          }
        }
        if (visible.size > 0) {
          // Активна самая «видимая» секция.
          const top = [...visible.entries()].sort((a, b) => b[1] - a[1])[0];
          if (top) {
            setActive(top[0]);
          }
        }
      },
      {
        rootMargin: `-${offset}px 0px -55% 0px`,
        threshold: [0.1, 0.25, 0.5, 0.75],
      }
    );

    for (const section of sections) {
      observer.observe(section);
    }
    return () => observer.disconnect();
  }, [ids, offset]);

  return active;
};
