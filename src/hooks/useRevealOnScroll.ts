import { useEffect } from 'react';

/**
 * @param rescanKey — при изменении хук пере-сканирует DOM: нужно, когда
 * [data-reveal]-узлы появляются после первого рендера (напр. после загрузки треков).
 */
export const useRevealOnScroll = (rescanKey?: unknown): void => {
  useEffect(() => {
    const revealNodes = Array.from(
      document.querySelectorAll<HTMLElement>('[data-reveal]:not(.is-visible)')
    );
    const isMobileViewport = window.matchMedia('(max-width: 860px)').matches;
    const mobileImmediateNodes = isMobileViewport
      ? revealNodes.filter((node) => node.hasAttribute('data-reveal-mobile-immediate'))
      : [];
    const earlyRevealNodes = revealNodes.filter(
      (node) => !mobileImmediateNodes.includes(node) && node.hasAttribute('data-reveal-early')
    );

    if (mobileImmediateNodes.length > 0) {
      requestAnimationFrame(() => {
        for (const node of mobileImmediateNodes) {
          node.classList.add('is-visible');
        }
      });
    }

    const observerNodes = revealNodes.filter(
      (node) => !mobileImmediateNodes.includes(node) && !earlyRevealNodes.includes(node)
    );

    if (typeof IntersectionObserver === 'undefined') {
      for (const node of earlyRevealNodes) {
        node.classList.add('is-visible');
      }
      for (const node of observerNodes) {
        node.classList.add('is-visible');
      }
      return;
    }

    let earlyObserver: IntersectionObserver | null = null;
    if (earlyRevealNodes.length > 0) {
      earlyObserver = new IntersectionObserver(
        (entries) => {
          for (const entry of entries) {
            if (!entry.isIntersecting) {
              continue;
            }
            entry.target.classList.add('is-visible');
            earlyObserver?.unobserve(entry.target);
          }
        },
        {
          threshold: 0.04,
          rootMargin: '0px 0px -2% 0px',
        }
      );

      for (const node of earlyRevealNodes) {
        earlyObserver.observe(node);
      }
    }

    if (observerNodes.length === 0) {
      return () => {
        earlyObserver?.disconnect();
      };
    }

    const observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (!entry.isIntersecting) {
            continue;
          }
          entry.target.classList.add('is-visible');
          observer.unobserve(entry.target);
        }
      },
      {
        threshold: 0.2,
        rootMargin: '0px 0px -10% 0px',
      }
    );

    for (const node of observerNodes) {
      observer.observe(node);
    }

    return () => {
      earlyObserver?.disconnect();
      observer.disconnect();
    };
  }, [rescanKey]);
};
