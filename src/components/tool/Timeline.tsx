import { useEffect, useRef, useState, type CSSProperties } from 'react';
import type { TrackPoint } from '../../fit/types';
import { useI18n } from '../../i18n';

interface TimelineProps {
  points: TrackPoint[];
  index: number;
  onIndex: (i: number) => void;
  /** Форматтер времени мм:сс (fmt.clock). */
  fmtClock: (sec: number) => string;
}

/** Полное «проигрывание» трека занимает столько миллисекунд. */
const PLAY_MS = 20000;

/**
 * Таймлайн трека: ползунок по точкам маршрута + авто-проигрывание.
 * Тянешь — маршрут дорисовывается и метрики пересчитываются под момент.
 */
export const Timeline = ({ points, index, onIndex, fmtClock }: TimelineProps) => {
  const { t } = useI18n();
  const max = Math.max(0, points.length - 1);
  const [playing, setPlaying] = useState(false);
  const rafRef = useRef<number | null>(null);
  const onIndexRef = useRef(onIndex);
  onIndexRef.current = onIndex;

  // Авто-проигрывание: за PLAY_MS проходим весь трек, затем стоп на конце.
  useEffect(() => {
    if (!playing || max === 0) return;
    const startIndex = index >= max ? 0 : index;
    const startTime = performance.now();
    const tick = (now: number) => {
      const frac = (now - startTime) / PLAY_MS;
      const next = Math.min(max, startIndex + Math.round(frac * max));
      onIndexRef.current(next);
      if (next >= max) {
        setPlaying(false);
        return;
      }
      rafRef.current = requestAnimationFrame(tick);
    };
    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
    // index намеренно не в зависимостях: перезапуск только по кнопке play.
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [playing, max]);

  const pct = max > 0 ? (index / max) * 100 : 0;
  const elapsed = points[Math.min(index, max)]?.t ?? 0;

  return (
    <div className="timeline">
      <button
        type="button"
        className="icon-btn timeline__play"
        aria-label={playing ? t.sections.detail.pause : t.sections.detail.play}
        title={playing ? t.sections.detail.pause : t.sections.detail.play}
        onClick={() => setPlaying((p) => !p)}
      >
        <i className={`fa-solid ${playing ? 'fa-pause' : 'fa-play'}`} aria-hidden="true" />
      </button>
      <input
        type="range"
        className="timeline__range"
        min={0}
        max={max}
        step={1}
        value={Math.min(index, max)}
        style={{ '--fill': `${pct}%` } as CSSProperties}
        aria-label={t.sections.detail.timeline}
        onChange={(e) => {
          if (playing) setPlaying(false);
          onIndex(Number(e.target.value));
        }}
      />
      <span className="timeline__readout">
        <b>{fmtClock(elapsed)}</b>
        <small>
          {Math.min(index + 1, max + 1)} / {max + 1}
        </small>
      </span>
    </div>
  );
};
