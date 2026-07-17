import type { Map as LeafletMap } from 'leaflet';

/**
 * Хэндл единственной Leaflet-карты приложения — нужен PNG-экспорту,
 * чтобы снять текущий вид (масштаб и положение) вне React-дерева.
 */
export const mapHandle: { map: LeafletMap | null; container: HTMLElement | null } = {
  map: null,
  container: null,
};
