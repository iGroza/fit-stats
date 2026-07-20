import { useEffect, useRef } from 'react';
import type { CircleMarker, Polyline } from 'leaflet';
import { thinLatLngs } from '../../fit/thinPoints';
import type { Track } from '../../fit/types';
import { DEFAULT_DETAIL_LAYER } from '../../fit/mapLayers';
import { MapCanvas } from './MapCanvas';
import type { MapCanvasHandle } from './MapCanvas';

interface TrackProgressMapProps {
  track: Track;
  /** Индекс точки в track.points, до которого рисуется маршрут. */
  progressIndex: number;
  className?: string;
}

/** Точек маршрута на карте деталей — плотнее обзора, трек здесь один. */
const DETAIL_POINTS = 600;

/**
 * Карта одного трека с прогрессивной отрисовкой: маршрут «дорисовывается»
 * до выбранной на таймлайне точки, голова маршрута отмечена маркером.
 * НЕ регистрируется в mapHandle — экспорт PNG продолжает снимать обзорную карту.
 */
export const TrackProgressMap = ({ track, progressIndex, className }: TrackProgressMapProps) => {
  const handleRef = useRef<MapCanvasHandle | null>(null);
  const latlngsRef = useRef<[number, number][]>([]);
  const progLineRef = useRef<Polyline | null>(null);
  const headRef = useRef<CircleMarker | null>(null);

  /** progressIndex (по track.points) → индекс в прорежённом массиве координат. */
  const gpsIndex = (index: number): number => {
    const n = latlngsRef.current.length;
    const total = track.points.length - 1;
    if (n === 0 || total <= 0) return 0;
    const frac = Math.max(0, Math.min(1, index / total));
    return Math.round(frac * (n - 1));
  };

  const drawProgress = (index: number) => {
    const latlngs = latlngsRef.current;
    const prog = progLineRef.current;
    const head = headRef.current;
    if (!latlngs.length || !prog || !head) return;
    const k = gpsIndex(index);
    prog.setLatLngs(latlngs.slice(0, k + 1));
    head.setLatLng(latlngs[k]);
  };

  const onReady = (h: MapCanvasHandle) => {
    handleRef.current = h;
    const { L, map, layers } = h;
    const latlngs = thinLatLngs(track.points, DETAIL_POINTS);
    latlngsRef.current = latlngs;
    layers.clearLayers();
    if (latlngs.length < 2) return;

    // Бледный полный маршрут — «трасса», по которой ползёт прогресс.
    L.polyline(latlngs, { color: track.color, weight: 3, opacity: 0.22 }).addTo(layers);
    // Пройденная часть — яркая.
    progLineRef.current = L.polyline([latlngs[0]], {
      color: track.color,
      weight: 4,
      opacity: 0.95,
    }).addTo(layers);
    // Старт и голова маршрута.
    L.circleMarker(latlngs[0], {
      radius: 5,
      color: '#0a0a0a',
      weight: 1.5,
      fillColor: '#4ade80',
      fillOpacity: 1,
    }).addTo(layers);
    headRef.current = L.circleMarker(latlngs[0], {
      radius: 6,
      color: '#0a0a0a',
      weight: 2,
      fillColor: '#ffffff',
      fillOpacity: 1,
    }).addTo(layers);

    const bounds = L.latLngBounds(latlngs);
    if (bounds.isValid()) map.fitBounds(bounds, { padding: [28, 28] });
    drawProgress(progressIndex);
  };

  // Перерисовка прогресса при перетаскивании таймлайна.
  useEffect(() => {
    requestAnimationFrame(() => drawProgress(progressIndex));
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [progressIndex]);

  return (
    <MapCanvas
      className={className ?? 'track-map glass'}
      registerHandle={false}
      defaultLayer={DEFAULT_DETAIL_LAYER}
      layers={['topo', 'osm', 'esri-sat', 'dark']}
      scrollWheelZoom
      onReady={onReady}
    />
  );
};
