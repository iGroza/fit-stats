import { useEffect, useRef } from 'react';
import type { LatLngBounds } from 'leaflet';
import { thinLatLngs } from '../../fit/thinPoints';
import type { Track } from '../../fit/types';
import { useI18n, sportLabel } from '../../i18n';
import { DEFAULT_OVERVIEW_LAYER } from '../../fit/mapLayers';
import { MapCanvas } from './MapCanvas';
import type { MapCanvasHandle } from './MapCanvas';

interface TrackMapProps {
  tracks: Track[];
  /** Пока идёт загрузка — не перерисовываем сотни полилиний на каждый батч. */
  busy?: boolean;
}

/** Макс. точек на полилинию; для 200+ треков иначе Leaflet подвисает. */
const MAP_POINTS = 320;

/**
 * Обзорная карта всех треков (Leaflet, через общий MapCanvas). Скрытые из
 * анализа треки не показываются. Регистрируется в mapHandle — экспорт PNG
 * снимает именно её текущий вид.
 */
export const TrackMap = ({ tracks, busy = false }: TrackMapProps) => {
  const { t, fmt } = useI18n();
  const handleRef = useRef<MapCanvasHandle | null>(null);
  const boundsRef = useRef<LatLngBounds | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const tRef = useRef(t);
  tRef.current = t;
  const fmtRef = useRef(fmt);
  fmtRef.current = fmt;

  const drawTracks = () => {
    const handle = handleRef.current;
    if (!handle) return;
    const { L, map, layers } = handle;
    const current = tracksRef.current;
    const dict = tRef.current;
    const format = fmtRef.current;

    layers.clearLayers();
    const allBounds = L.latLngBounds([]);
    let gpsVisible = 0;
    for (const tr of current) {
      if (tr.visible && tr.hasGps) gpsVisible++;
    }
    const showEndpoints = gpsVisible <= 40;

    for (const track of current) {
      if (!track.visible || !track.hasGps) continue;
      const latlngs = thinLatLngs(track.points, MAP_POINTS);
      if (latlngs.length < 2) continue;

      const line = L.polyline(latlngs, {
        color: track.color,
        weight: 3,
        opacity: 0.85,
      }).addTo(layers);
      line.bindPopup(
        `<b>${track.fileName}</b><br/>${sportLabel(dict, track.summary.sport)} · ${format.distance(
          track.summary.distance
        )}<br/>${format.date(track.summary.startTime)}`
      );
      if (showEndpoints) {
        const dot = (latlng: [number, number], color: string, title: string) =>
          L.circleMarker(latlng, {
            radius: 4,
            color: '#0a0a0a',
            weight: 1.5,
            fillColor: color,
            fillOpacity: 1,
          })
            .bindTooltip(title)
            .addTo(layers);
        dot(latlngs[0], '#4ade80', `${dict.sections.map.start} · ${track.fileName}`);
        dot(latlngs[latlngs.length - 1], '#f25e8a', `${dict.sections.map.finish} · ${track.fileName}`);
      }

      allBounds.extend(line.getBounds());
    }

    boundsRef.current = allBounds.isValid() ? allBounds : null;
    if (allBounds.isValid()) {
      map.fitBounds(allBounds, { padding: [32, 32] });
    }
  };

  const recenter = () => {
    const map = handleRef.current?.map;
    if (map && boundsRef.current) {
      map.fitBounds(boundsRef.current, { padding: [32, 32] });
    }
  };

  // Перерисовка только когда загрузка закончилась (или треки сменились без busy).
  useEffect(() => {
    if (busy) return;
    drawTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, busy, t.locale]);

  const gpsCount = tracks.filter((tr) => tr.visible && tr.hasGps).length;

  return (
    <MapCanvas
      className="track-map glass"
      registerHandle
      defaultLayer={DEFAULT_OVERVIEW_LAYER}
      scrollWheelZoom={false}
      onReady={(h) => {
        handleRef.current = h;
        drawTracks();
      }}
    >
      {busy && (
        <div className="track-map__busy">
          <i className="fa-solid fa-spinner fa-spin" aria-hidden="true" />
        </div>
      )}
      {gpsCount > 0 && !busy && (
        <button
          type="button"
          className="track-map__recenter"
          title={t.sections.map.recenter}
          aria-label={t.sections.map.recenter}
          onClick={recenter}
        >
          <i className="fa-solid fa-arrows-to-circle" aria-hidden="true" />
        </button>
      )}
      {gpsCount === 0 && !busy && (
        <div className="track-map__empty">
          <i className="fa-solid fa-map-location-dot" aria-hidden="true" />
          <span>{t.sections.map.noGps}</span>
        </div>
      )}
    </MapCanvas>
  );
};
