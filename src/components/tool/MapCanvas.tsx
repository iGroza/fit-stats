import { useEffect, useRef, useState } from "react";
import type { ReactNode } from "react";
import type { Map as LeafletMap, LayerGroup, TileLayer } from "leaflet";
import "leaflet/dist/leaflet.css";
import {
  BASE_LAYERS,
  BASE_LAYER_MAP,
  makeTileLayer,
  type BaseLayerId,
} from "../../fit/mapLayers";
import { mapHandle } from "../../state/mapHandle";
import { useI18n } from "../../i18n";

/** Хэндл готовой карты — родитель рисует в layers, читает map/L. */
export interface MapCanvasHandle {
  map: LeafletMap;
  L: typeof import("leaflet");
  layers: LayerGroup;
  invalidate: () => void;
}

export interface MapCanvasProps {
  /** Какие базовые слои показать в переключателе (по умолчанию все). */
  layers?: BaseLayerId[];
  defaultLayer?: BaseLayerId;
  /** Регистрировать карту в mapHandle (для экспорта PNG). Только обзорная карта. */
  registerHandle?: boolean;
  /** Крутить колесом сразу (модалка) или только после фокуса (обзор). */
  scrollWheelZoom?: boolean;
  className?: string;
  onReady?: (h: MapCanvasHandle) => void;
  /** Доп. контролы поверх карты (recenter, busy, empty). */
  children?: ReactNode;
}

const ALL_LAYER_IDS = BASE_LAYERS.map((l) => l.id);

/**
 * Общее ядро Leaflet-карты: инициализация, переключатель слоёв,
 * разворот на весь экран. Библиотека грузится динамически в useEffect —
 * безопасно для SSR/пререндера.
 */
export const MapCanvas = ({
  layers,
  defaultLayer = "dark",
  registerHandle = false,
  scrollWheelZoom = false,
  className,
  onReady,
  children,
}: MapCanvasProps) => {
  const { t } = useI18n();
  const containerRef = useRef<HTMLDivElement>(null);
  const wrapRef = useRef<HTMLDivElement>(null);
  const mapRef = useRef<LeafletMap | null>(null);
  const leafletRef = useRef<typeof import("leaflet") | null>(null);
  const baseLayerRef = useRef<TileLayer | null>(null);
  const overlayRef = useRef<LayerGroup | null>(null);

  const [currentLayer, setCurrentLayer] = useState<BaseLayerId>(defaultLayer);
  const [isFullscreen, setIsFullscreen] = useState(false);

  // Стабильные ссылки на пропсы, которые нужны разово в init-эффекте.
  const onReadyRef = useRef(onReady);
  onReadyRef.current = onReady;
  const scrollWheelRef = useRef(scrollWheelZoom);
  scrollWheelRef.current = scrollWheelZoom;
  const registerRef = useRef(registerHandle);
  registerRef.current = registerHandle;

  const layerIds = (layers ?? ALL_LAYER_IDS).filter((id) => BASE_LAYER_MAP[id]);

  const invalidate = () => {
    const map = mapRef.current;
    if (map) requestAnimationFrame(() => map.invalidateSize());
  };

  // Инициализация карты — один раз.
  useEffect(() => {
    let cancelled = false;
    (async () => {
      const L = await import("leaflet");
      if (cancelled || !containerRef.current || mapRef.current) return;
      leafletRef.current = L;
      const map = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
        scrollWheelZoom: scrollWheelRef.current,
        preferCanvas: true,
      });
      // Зум — вниз-влево, чтобы переключатель слоёв сверху его не перекрывал.
      map.zoomControl.setPosition("bottomleft");
      if (!scrollWheelRef.current) {
        // Обзор: колесо включаем только когда карта в фокусе — иначе мешает скроллу.
        map.on("focus click", () => map.scrollWheelZoom.enable());
        map.on("blur", () => map.scrollWheelZoom.disable());
      }
      const def = BASE_LAYER_MAP[defaultLayer];
      baseLayerRef.current = makeTileLayer(L, def).addTo(map);
      map.setView([55.75, 37.62], 4);
      overlayRef.current = L.layerGroup().addTo(map);
      mapRef.current = map;

      if (registerRef.current) {
        mapHandle.map = map;
        mapHandle.container = map.getContainer();
      }

      onReadyRef.current?.({ map, L, layers: overlayRef.current, invalidate });
      const attribution = document.querySelector(
        ".leaflet-control-attribution.leaflet-control",
      );
      if (attribution instanceof HTMLElement) {
        attribution.style.display = "none";
      }
    })();
    return () => {
      cancelled = true;
      if (registerRef.current) {
        mapHandle.map = null;
        mapHandle.container = null;
      }
      mapRef.current?.remove();
      mapRef.current = null;
      overlayRef.current = null;
      baseLayerRef.current = null;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  // Смена базового слоя: заменяем тайлы, оставляя оверлей с треками сверху.
  const switchLayer = (id: BaseLayerId) => {
    const L = leafletRef.current;
    const map = mapRef.current;
    if (!L || !map || id === currentLayer) return;
    if (baseLayerRef.current) map.removeLayer(baseLayerRef.current);
    baseLayerRef.current = makeTileLayer(L, BASE_LAYER_MAP[id]).addTo(map);
    baseLayerRef.current.bringToBack();
    overlayRef.current?.eachLayer((l) => (l as TileLayer).bringToFront?.());
    setCurrentLayer(id);
  };

  const toggleFullscreen = () => {
    setIsFullscreen((prev) => {
      const next = !prev;
      // Leaflet кэширует размер контейнера — пересчитываем после смены раскладки.
      requestAnimationFrame(() => {
        requestAnimationFrame(() => mapRef.current?.invalidateSize());
      });
      return next;
    });
  };

  // Esc выходит из фуллскрина и НЕ даёт закрыться модалке (stopPropagation).
  useEffect(() => {
    if (!isFullscreen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === "Escape") {
        e.stopPropagation();
        setIsFullscreen(false);
        requestAnimationFrame(() => mapRef.current?.invalidateSize());
      }
    };
    window.addEventListener("keydown", onKey, true);
    return () => window.removeEventListener("keydown", onKey, true);
  }, [isFullscreen]);

  return (
    <div
      ref={wrapRef}
      className={`${className ?? "track-map"}${isFullscreen ? " is-fullscreen" : ""}`}
    >
      <div ref={containerRef} className="track-map__canvas" />

      {layerIds.length > 1 && (
        <div
          className="map-layers"
          role="group"
          aria-label={t.sections.map.layer}
        >
          {layerIds.map((id) => {
            const def = BASE_LAYER_MAP[id];
            const active = currentLayer === id;
            return (
              <button
                key={id}
                type="button"
                className={`map-layers__btn${active ? " is-active" : ""}`}
                aria-pressed={active}
                title={t.sections.map.layers[def.labelKey]}
                onClick={() => switchLayer(id)}
              >
                <i className={`fa-solid ${def.icon}`} aria-hidden="true" />
                <span>{t.sections.map.layers[def.labelKey]}</span>
              </button>
            );
          })}
        </div>
      )}

      <button
        type="button"
        className="track-map__expand"
        title={
          isFullscreen
            ? t.sections.map.exitFullscreen
            : t.sections.map.fullscreen
        }
        aria-label={
          isFullscreen
            ? t.sections.map.exitFullscreen
            : t.sections.map.fullscreen
        }
        aria-pressed={isFullscreen}
        onClick={toggleFullscreen}
      >
        <i
          className={`fa-solid ${isFullscreen ? "fa-compress" : "fa-expand"}`}
          aria-hidden="true"
        />
      </button>

      {children}
    </div>
  );
};
