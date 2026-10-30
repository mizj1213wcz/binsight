// City settings for the dashboard. Keep in sync with config/city.py (also served at GET /api/config).

export const CITY = {
  name: 'Edinburgh',
  authority: 'City of Edinburgh Council',
  depot: { name: 'Seafield Depot', latitude: 55.9675, longitude: -3.1372 },
  center: [55.9420, -3.2050] as [number, number],
  zoom: 12,
  areaTypes: ['City Centre', 'Inner Residential', 'Outer Residential'],
  defaultNewBin: { latitude: '55.9566', longitude: '-3.1913' },
};

export const DEPOT_POSITION: [number, number] = [CITY.depot.latitude, CITY.depot.longitude];

const ESRI_ATTRIBUTION =
  'Basemap &copy; <a href="https://www.esri.com">Esri</a> and its data providers ' +
  '(Esri, HERE, Garmin, &copy; OpenStreetMap contributors, GIS user community)';

// Esri basemaps, as used by the council's ArcGIS Hub open-data site, plus OpenStreetMap.
export const MAP_LAYERS = {
  arcgisLight: {
    label: 'ArcGIS Light Gray',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Base/MapServer/tile/{z}/{y}/{x}',
    labels: 'https://server.arcgisonline.com/ArcGIS/rest/services/Canvas/World_Light_Gray_Reference/MapServer/tile/{z}/{y}/{x}',
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 16,
  },
  arcgisStreets: {
    label: 'ArcGIS Streets',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Street_Map/MapServer/tile/{z}/{y}/{x}',
    labels: null,
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 19,
  },
  arcgisTopo: {
    label: 'ArcGIS Topographic',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Topo_Map/MapServer/tile/{z}/{y}/{x}',
    labels: null,
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 19,
  },
  satellite: {
    label: 'ArcGIS Imagery',
    url: 'https://server.arcgisonline.com/ArcGIS/rest/services/World_Imagery/MapServer/tile/{z}/{y}/{x}',
    labels: null,
    attribution: ESRI_ATTRIBUTION,
    maxZoom: 19,
  },
  osm: {
    label: 'OpenStreetMap',
    url: 'https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png',
    labels: null,
    attribution: '&copy; <a href="https://www.openstreetmap.org/copyright">OpenStreetMap</a> contributors',
    maxZoom: 19,
  },
} as const;

export type LayerKey = keyof typeof MAP_LAYERS;
export const DEFAULT_LAYER: LayerKey = 'arcgisLight';

// 12 distinguishable route colours (a fleet of 24 trucks reuses each twice)
export const ROUTE_COLORS = [
  '#0079c1', '#d83020', '#2e8540', '#8b5cf6', '#e07b00', '#00a3a3',
  '#c2185b', '#5d4037', '#1565c0', '#9e9d24', '#6a1b9a', '#00838f',
];
