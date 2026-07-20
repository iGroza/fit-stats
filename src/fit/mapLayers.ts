import type * as LType from 'leaflet';

/** Идентификаторы базовых слоёв карты. Совпадают с ключами t.sections.map.layers. */
export type BaseLayerId = 'dark' | 'topo' | 'osm' | 'esri-sat';

export interface BaseLayerDef {
  id: BaseLayerId;
  /** Ключ подписи в словаре: t.sections.map.layers[labelKey]. */
  labelKey: BaseLayerId;
  /** FontAwesome-класс иконки в переключателе. */
  icon: string;
  url: string;
  attribution: string;
  maxZoom: number;
  maxNativeZoom?: number;
  subdomains?: string;
}

/**
 * Базовые слои (взаимоисключающие). OpenTopoMap — рельеф/тропы; будьте
 * бережны с их волонтёрским сервером: он рассчитан на умеренную нагрузку.
 * dark (CARTO) стоит по умолчанию в обзорной карте — сохраняет тему и
 * не «пачкает» canvas при экспорте PNG (CORS-совместим).
 */
export const BASE_LAYERS: BaseLayerDef[] = [
  {
    id: 'dark',
    labelKey: 'dark',
    icon: 'fa-moon',
    url: 'https://{s}.basemaps.cartocdn.com/dark_all/{z}/{x}/{y}{r}.png',
    subdomains: 'abcd',
    maxZoom: 20,
    attribution: '&copy; OpenStreetMap contributors &copy; CARTO',
  },
  {
    id: 'topo',
    labelKey: 'topo',
    icon: 'fa-mountain-sun',
    url: 'https://{s}.tile.opentopomap.org/{z}/{x}/{y}.png',
    subdomains: 'abc',
    maxZoom: 17,
    maxNativeZoom: 17,
    attribution:
      'Map data: &copy; OpenStreetMap contributors, SRTM | &copy; OpenTopoMap (CC-BY-SA)',
  },
  {
    id: 'osm',
    labelKey: 'osm',
    icon: 'fa-road',
    url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png',
    maxZoom: 19,
    attribution: '&copy; OpenStreetMap contributors',
  },
  {
    id: 'esri-sat',
    labelKey: 'esri-sat',
    icon: 'fa-satellite',
    // Порядок {z}/{y}/{x} — так отдаёт ArcGIS World Imagery.
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    maxZoom: 19,
    attribution: 'Tiles &copy; Esri, Maxar, Earthstar Geographics, GIS User Community',
  },
];

export const BASE_LAYER_MAP: Record<BaseLayerId, BaseLayerDef> = Object.fromEntries(
  BASE_LAYERS.map((l) => [l.id, l])
) as Record<BaseLayerId, BaseLayerDef>;

/** Обзорная карта: рельеф (OpenTopoMap) — виден ландшафт, дороги и тропы. */
export const DEFAULT_OVERVIEW_LAYER: BaseLayerId = 'topo';
/** Карта деталей трека: рельеф/тропы. */
export const DEFAULT_DETAIL_LAYER: BaseLayerId = 'topo';

/** Создаёт тайловый слой Leaflet из описания. L передаётся из динамического импорта. */
export const makeTileLayer = (L: typeof LType, def: BaseLayerDef): LType.TileLayer =>
  L.tileLayer(def.url, {
    attribution: def.attribution,
    subdomains: def.subdomains ?? 'abc',
    maxZoom: def.maxZoom,
    maxNativeZoom: def.maxNativeZoom,
    // crossOrigin нужен, чтобы экспорт PNG (drawImage) не «пачкал» canvas.
    crossOrigin: true,
  });
