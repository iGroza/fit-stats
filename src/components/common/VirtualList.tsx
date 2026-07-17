import { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import type { CSSProperties, ReactNode } from 'react';

interface VirtualListProps<T> {
  items: T[];
  /** Высота строки по умолчанию, px. */
  estimateSize: number;
  /** Переопределение высоты для конкретной строки (аккордеон). */
  getItemSize?: (index: number, item: T) => number;
  /** Высота вьюпорта; если не задана — берётся из CSS/ResizeObserver. */
  height?: number;
  overscan?: number;
  getKey: (item: T, index: number) => string;
  renderItem: (item: T, index: number) => ReactNode;
  className?: string;
  innerClassName?: string;
  ariaLabel?: string;
  role?: string;
  /** Прокрутить к индексу (например, раскрытая гармошка). */
  scrollToIndex?: number | null;
}

/**
 * Windowed-список с поддержкой переменной высоты строк (аккордеон).
 */
export function VirtualList<T>({
  items,
  estimateSize,
  getItemSize,
  height,
  overscan = 6,
  getKey,
  renderItem,
  className,
  innerClassName,
  ariaLabel,
  role = 'list',
  scrollToIndex = null,
}: VirtualListProps<T>) {
  const parentRef = useRef<HTMLDivElement>(null);
  const [scrollTop, setScrollTop] = useState(0);
  const [viewport, setViewport] = useState(height ?? 480);

  useEffect(() => {
    const el = parentRef.current;
    if (!el) return;
    const measure = () => {
      const h = height ?? el.clientHeight;
      if (h > 0) setViewport(h);
    };
    measure();
    const ro = new ResizeObserver(measure);
    ro.observe(el);
    return () => ro.disconnect();
  }, [height]);

  const sizes = useMemo(() => {
    const arr = new Array<number>(items.length);
    for (let i = 0; i < items.length; i++) {
      arr[i] = getItemSize ? getItemSize(i, items[i]) : estimateSize;
    }
    return arr;
  }, [items, estimateSize, getItemSize]);

  const offsets = useMemo(() => {
    const off = new Array<number>(sizes.length + 1);
    off[0] = 0;
    for (let i = 0; i < sizes.length; i++) off[i + 1] = off[i] + sizes[i];
    return off;
  }, [sizes]);

  const totalHeight = offsets[offsets.length - 1] ?? 0;

  const findStart = useCallback(
    (y: number) => {
      // Бинарный поиск первого элемента с offset >= y... то есть offset[i] <= y < offset[i+1]
      let lo = 0;
      let hi = items.length;
      while (lo < hi) {
        const mid = (lo + hi) >> 1;
        if (offsets[mid + 1] <= y) lo = mid + 1;
        else hi = mid;
      }
      return lo;
    },
    [items.length, offsets]
  );

  const { start, end, offsetY } = useMemo(() => {
    if (!items.length) return { start: 0, end: 0, offsetY: 0 };
    const first = Math.max(0, findStart(scrollTop) - overscan);
    let last = first;
    const bottom = scrollTop + viewport;
    while (last < items.length && offsets[last] < bottom) last++;
    last = Math.min(items.length, last + overscan);
    return { start: first, end: last, offsetY: offsets[first] };
  }, [items.length, findStart, scrollTop, viewport, overscan, offsets]);

  const onScroll = useCallback(() => {
    const el = parentRef.current;
    if (!el) return;
    setScrollTop(el.scrollTop);
  }, []);

  // Прокрутка к раскрытой строке.
  useEffect(() => {
    if (scrollToIndex == null || scrollToIndex < 0 || scrollToIndex >= items.length) return;
    const el = parentRef.current;
    if (!el) return;
    const top = offsets[scrollToIndex];
    const size = sizes[scrollToIndex];
    const viewTop = el.scrollTop;
    const viewBottom = viewTop + el.clientHeight;
    if (top < viewTop) el.scrollTop = top;
    else if (top + Math.min(size, el.clientHeight) > viewBottom) {
      el.scrollTop = Math.max(0, top - 24);
    }
  }, [scrollToIndex, offsets, sizes, items.length]);

  const slice = items.slice(start, end);

  const style: CSSProperties = height
    ? { height, overflow: 'auto', position: 'relative', willChange: 'scroll-position' }
    : { overflow: 'auto', position: 'relative', willChange: 'scroll-position' };

  return (
    <div
      ref={parentRef}
      className={className}
      style={style}
      onScroll={onScroll}
      role={role}
      aria-label={ariaLabel}
    >
      <div style={{ height: totalHeight, position: 'relative' }} className={innerClassName}>
        <div
          style={{
            position: 'absolute',
            top: 0,
            left: 0,
            right: 0,
            transform: `translateY(${offsetY}px)`,
          }}
        >
          {slice.map((item, i) => {
            const index = start + i;
            return (
              <div
                key={getKey(item, index)}
                role={role === 'list' ? 'listitem' : undefined}
                style={{ minHeight: sizes[index], boxSizing: 'border-box' }}
              >
                {renderItem(item, index)}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
