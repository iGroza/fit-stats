import { useEffect, useMemo, useState } from 'react';
import type { Track } from '../../fit/types';
import { ascentPrefix, computeHrZones, isPaceSport, liveMetricsAt } from '../../fit/stats';
import { useI18n, sportLabel } from '../../i18n';
import { TrackProgressMap } from './TrackProgressMap';
import { Timeline } from './Timeline';
import { HrZones } from './HrZones';
import { TrackDetails } from './TrackList';

const SPORT_ICONS: Record<string, string> = {
  running: 'fa-person-running',
  cycling: 'fa-person-biking',
  walking: 'fa-person-walking',
  hiking: 'fa-person-hiking',
  swimming: 'fa-person-swimming',
};

interface TrackDetailModalProps {
  track: Track | null;
  onClose: () => void;
}

/**
 * Полноэкранная модалка деталей трека: карта с прогрессивной отрисовкой и
 * таймлайном, живые метрики под момент, полная сводка и отсечки.
 */
export const TrackDetailModal = ({ track, onClose }: TrackDetailModalProps) => {
  const { t, fmt } = useI18n();
  const [index, setIndex] = useState(0);

  const lastIndex = track ? Math.max(0, track.points.length - 1) : 0;

  // Новый трек — сбрасываем ползунок на финиш (маршрут показан целиком).
  useEffect(() => {
    setIndex(lastIndex);
  }, [track?.id, lastIndex]);

  // Esc закрывает, скролл страницы блокируется (как в модалке истории).
  useEffect(() => {
    if (!track) return;
    const onKey = (e: KeyboardEvent) => e.key === 'Escape' && onClose();
    window.addEventListener('keydown', onKey);
    document.body.style.overflow = 'hidden';
    return () => {
      window.removeEventListener('keydown', onKey);
      document.body.style.overflow = '';
    };
  }, [track, onClose]);

  const prefix = useMemo(() => (track ? ascentPrefix(track) : null), [track]);
  const hrZones = useMemo(() => (track ? computeHrZones(track) : null), [track]);

  if (!track) return null;

  const s = track.summary;
  const pace = isPaceSport(s.sport);
  const d = t.sections.detail;
  const lm = liveMetricsAt(track, index, prefix ?? undefined);
  const hasTimeline = track.points.length > 1;

  const live: { label: string; value: string }[] = [
    { label: d.live.elapsed, value: fmt.clock(lm.elapsed) },
    { label: d.live.distance, value: fmt.distance(lm.distance) },
    pace
      ? { label: d.live.pace, value: fmt.pace(lm.speed) }
      : { label: d.live.speed, value: fmt.speed(lm.speed) },
    { label: d.live.hr, value: lm.hr ? `${Math.round(lm.hr)} ${t.units.bpm}` : '—' },
    { label: d.live.alt, value: lm.alt !== undefined ? `${Math.round(lm.alt)} ${t.units.m}` : '—' },
    { label: d.live.ascent, value: `${Math.round(lm.ascent)} ${t.units.m}` },
  ];

  return (
    <div className="modal" role="dialog" aria-modal="true" aria-label={d.title}>
      <div className="modal__backdrop" onClick={onClose} />
      <div className="track-modal glass">
        <div className="track-modal__head">
          <span className="modal__icon" aria-hidden="true" style={{ color: track.color }}>
            <i className={`fa-solid ${SPORT_ICONS[s.sport ?? ''] ?? 'fa-location-dot'}`} />
          </span>
          <div className="modal__titles">
            <b>{track.fileName}</b>
            <small>
              {sportLabel(t, s.sport)} · {fmt.date(s.startTime)}
              {!track.hasGps && ` · ${t.row.noGps}`}
            </small>
          </div>
          <button type="button" className="icon-btn" aria-label={d.close} onClick={onClose}>
            <i className="fa-solid fa-xmark" aria-hidden="true" />
          </button>
        </div>

        <div className="track-modal__body">
          {track.hasGps && (
            <div className="track-modal__map">
              <TrackProgressMap key={track.id} track={track} progressIndex={index} />
            </div>
          )}

          {hasTimeline && (
            <div className="track-modal__timeline">
              <Timeline
                points={track.points}
                index={index}
                onIndex={setIndex}
                fmtClock={fmt.clock}
              />
              <div className="timeline__chips">
                {live.map((c) => (
                  <span key={c.label} className="timeline__chip">
                    <small>{c.label}</small>
                    <b>{c.value}</b>
                  </span>
                ))}
              </div>
            </div>
          )}

          {hrZones && <HrZones zones={hrZones} />}

          <TrackDetails track={track} />
        </div>
      </div>
    </div>
  );
};
