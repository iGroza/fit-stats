import { Fragment, useEffect, useRef, useState } from 'react';
import type { ElementType, ReactNode } from 'react';
import { animate, stagger } from 'animejs';

interface AnimatedHeadingProps {
  text: string;
  as?: ElementType;
  className?: string;
  /** Доп. контент после анимированного текста (например, иконка). */
  children?: ReactNode;
}

/**
 * Заголовок с посимвольным reveal на anime.js v4.
 * SSR-безопасно: без JS / при reduced-motion текст виден сразу (класс will-animate не добавляется).
 */
export const AnimatedHeading = ({ text, as, className, children }: AnimatedHeadingProps) => {
  const Tag = as ?? 'h2';
  const ref = useRef<HTMLElement | null>(null);
  const [armed, setArmed] = useState(false);

  useEffect(() => {
    if (window.matchMedia('(prefers-reduced-motion: reduce)').matches) {
      return;
    }
    setArmed(true);
  }, []);

  useEffect(() => {
    if (!armed) {
      return;
    }
    const element = ref.current;
    if (!element) {
      return;
    }
    const chars = Array.from(element.querySelectorAll<HTMLElement>('.char'));
    if (chars.length === 0) {
      return;
    }

    let animation: ReturnType<typeof animate> | null = null;
    const observer = new IntersectionObserver(
      (entries) => {
        if (!entries[0]?.isIntersecting) {
          return;
        }
        observer.disconnect();
        animation = animate(chars, {
          opacity: [0, 1],
          translateY: ['1.1em', '0em'],
          rotateZ: [4, 0],
          duration: 720,
          delay: stagger(26, { start: 60 }),
          ease: 'out(3)',
          onComplete: () => {
            // снимаем will-change/слои после анимации — иначе они висят постоянно
            element.classList.remove('will-animate');
          },
        });
      },
      { threshold: 0.2, rootMargin: '0px 0px -8% 0px' }
    );

    observer.observe(element);
    return () => {
      observer.disconnect();
      animation?.pause();
    };
  }, [armed]);

  const words = text.split(' ');

  return (
    <Tag
      ref={ref as never}
      className={`anim-heading${armed ? ' will-animate' : ''}${className ? ` ${className}` : ''}`}
      aria-label={text}
    >
      <span aria-hidden="true">
        {words.map((word, wordIndex) => (
          <Fragment key={wordIndex}>
            <span className="word">
              {Array.from(word).map((char, charIndex) => (
                <span className="char" key={charIndex}>
                  {char}
                </span>
              ))}
            </span>
            {wordIndex < words.length - 1 ? ' ' : ''}
          </Fragment>
        ))}
      </span>
      {children}
    </Tag>
  );
};
