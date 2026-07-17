import { useEffect, useRef } from 'react';
import type { Map as LeafletMap, LayerGroup } from 'leaflet';
import 'leaflet/dist/leaflet.css';
import { thinLatLngs } from '../../fit/thinPoints';
import type { Track } from '../../fit/types';
import { useI18n, sportLabel } from '../../i18n';
import { mapHandle } from '../../state/mapHandle';

interface TrackMapProps {
  tracks: Track[];
  /** Пока идёт загрузка — не перерисовываем сотни полилиний на каждый батч. */
  busy?: boolean;
}

/* Тёмные тайлы CARTO — под pre-dawn палитру Dimension. */
const TILE_URL = 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png';
const TILE_ATTRIBUTION = 'fit.igroza.su';

/** Макс. точек на полилинию; для 200+ треков иначе Leaflet подвисает. */
const MAP_POINTS = 320;

/**
 * Карта треков (Leaflet). Скрытые из анализа треки на карте не показываются.
 * Библиотека подгружается динамически в useEffect — компонент безопасен
 * для SSR/prerender.
 */
export const TrackMap = ({ tracks, busy = false }: TrackMapProps) => {
  const { t, fmt } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const layersRef = useRef<LayerGroup | null>(null);
  const leafletRef = useRef<typeof import('leaflet') | null>(null);
  /** Рамка всех видимых треков — для кнопки центровки. */
  const boundsRef = useRef<import('leaflet').LatLngBounds | null>(null);
  const tracksRef = useRef(tracks);
  tracksRef.current = tracks;
  const tRef = useRef(t);
  tRef.current = t;
  const fmtRef = useRef(fmt);
  fmtRef.current = fmt;

  const drawTracks = () => {
    const L = leafletRef.current;
    const map = mapRef.current;
    const layers = layersRef.current;
    if (!L || !map || !layers) return;

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
      // Старт/финиш только если треков немного — иначе 400+ маркеров тормозят.
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
    if (mapRef.current && boundsRef.current) {
      mapRef.current.fitBounds(boundsRef.current, { padding: [32, 32] });
    }
  };

  // Инициализация карты — один раз, после монтирования.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import('leaflet');
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: false,
        preferCanvas: true,
      });
      map.on('focus click', () => map.scrollWheelZoom.enable());
      map.on('blur', () => map.scrollWheelZoom.disable());
      L.tileLayer(TILE_URL, {
        attribution: TILE_ATTRIBUTION,
        maxZoom: 19,
        crossOrigin: true,
      }).addTo(map);
      map.setView([55.75, 37.62], 4);
      layersRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;
      mapHandle.map = map;
      mapHandle.container = containerRef.current;
      drawTracks();
      const attribution = document.querySelector(
        '.leaflet-control-attribution.leaflet-control'
      );
      if (attribution instanceof HTMLElement) {
        attribution.style.display = 'none';
      }
    })();
    return () => {
      cancelled = true;
      mapHandle.map = null;
      mapHandle.container = null;
      mapRef.current?.remove();
      mapRef.current = null;
      layersRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Перерисовка только когда загрузка закончилась (или треки сменились без busy).
  useEffect(() => {
    if (busy) return;
    drawTracks();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [tracks, busy, t.locale]);

  const gpsCount = tracks.filter((tr) => tr.visible && tr.hasGps).length;

  return (
    <div className="track-map glass" data-reveal>
      <div ref={containerRef} className="track-map__canvas" />
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
    </div>
  );
};
