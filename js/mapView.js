// js/mapView.js
import { getNeutralColor, colorForVariable, formatValue } from './logic/colorScale.js';
import { average } from './logic/clusterAggregate.js';
import { MAPBOX_ACCESS_TOKEN } from './config.js';

const SUPERCLUSTER_URL = 'https://cdn.jsdelivr.net/npm/supercluster@8/+esm';

// Starting candidates ported from Leaflet's tuning (maxClusterRadius: 20 at
// 256px tiles, disableClusteringAtZoom: 11) via GL JS's zoom-numbering
// offset (GL JS renders 512px tiles, so GL JS zoom z corresponds to
// roughly Leaflet zoom z+1 for the same visual scale). NOT verified against
// the live site yet -- see Task 9.
const CLUSTER_RADIUS = 40;
const CLUSTER_MAX_ZOOM = 9;
const INITIAL_ZOOM = 5;
const FOCUS_ZOOM = 13;

export async function createMapView(mapElementId, crags) {
  const { default: Supercluster } = await import(SUPERCLUSTER_URL);

  const view = {
    activeColorFn: () => getNeutralColor(),
    activeVariable: 'temperature',
    activeMarkers: [],
    ...createEmitter(),
  };

  const map = new mapboxgl.Map({
    container: mapElementId,
    accessToken: MAPBOX_ACCESS_TOKEN,
    style: 'mapbox://styles/mapbox/streets-v12',
    center: [-3.5, 54.5],
    zoom: INITIAL_ZOOM,
  });

  const cragsById = new Map(crags.map((crag) => [crag.id, crag]));
  const points = crags.map((crag) => ({
    type: 'Feature',
    geometry: { type: 'Point', coordinates: [crag.lon, crag.lat] },
    properties: { cragId: crag.id, cragValue: null },
  }));
  const pointsByCragId = new Map(points.map((point) => [point.properties.cragId, point]));

  const index = new Supercluster({ radius: CLUSTER_RADIUS, maxZoom: CLUSTER_MAX_ZOOM });
  index.load(points);

  view.map = map;
  view.index = index;
  view.cragsById = cragsById;
  view.pointsByCragId = pointsByCragId;

  map.on('moveend', () => renderMarkers(view));
  renderMarkers(view);

  return view;
}

function renderMarkers(view) {
  const focusedEntry = view.activeMarkers.find((entry) => entry.el === document.activeElement);
  const focusedCragId = focusedEntry && focusedEntry.kind === 'crag' ? focusedEntry.cragId : null;

  for (const entry of view.activeMarkers) entry.marker.remove();
  view.activeMarkers = [];

  const bounds = view.map.getBounds();
  const bbox = [bounds.getWest(), bounds.getSouth(), bounds.getEast(), bounds.getNorth()];
  const zoom = Math.floor(view.map.getZoom());
  const results = view.index.getClusters(bbox, zoom);

  for (const feature of results) {
    const [lon, lat] = feature.geometry.coordinates;
    const entry = feature.properties.cluster ? buildClusterEntry(view, feature) : buildCragEntry(view, feature);
    entry.marker.setLngLat([lon, lat]).addTo(view.map);
    view.activeMarkers.push(entry);
  }

  if (focusedCragId) {
    const restored = view.activeMarkers.find((entry) => entry.kind === 'crag' && entry.cragId === focusedCragId);
    if (restored) restored.el.focus();
  }
}

function buildCragEntry(view, feature) {
  const crag = view.cragsById.get(feature.properties.cragId);
  const html = buildCragIcon(feature.properties.cragValue, view.activeVariable, view.activeColorFn);
  const el = htmlToElement(html);
  el.title = crag.name;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  const select = () => view.emit('crag:selected', { crag });
  el.addEventListener('click', select);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      select();
    }
  });
  return { kind: 'crag', cragId: crag.id, el, marker: new mapboxgl.Marker({ element: el }) };
}

function buildClusterEntry(view, feature) {
  const clusterId = feature.properties.cluster_id;
  const leaves = view.index.getLeaves(clusterId, Infinity);
  const values = leaves.map((leaf) => leaf.properties.cragValue);
  const html = createClusterIcon(values, view.activeVariable, view.activeColorFn);
  const el = htmlToElement(html);
  const [lon, lat] = feature.geometry.coordinates;
  const expand = () => {
    const expansionZoom = Math.min(view.index.getClusterExpansionZoom(clusterId), 20);
    view.map.easeTo({ center: [lon, lat], zoom: expansionZoom });
  };
  el.title = `${feature.properties.point_count} crags`;
  el.tabIndex = 0;
  el.setAttribute('role', 'button');
  el.addEventListener('click', expand);
  el.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' || event.key === ' ') {
      event.preventDefault();
      expand();
    }
  });
  return { kind: 'cluster', clusterId, el, marker: new mapboxgl.Marker({ element: el }) };
}

function htmlToElement(html) {
  const template = document.createElement('template');
  template.innerHTML = html.trim();
  return template.content.firstElementChild;
}

export function markerAppearance(value, variable, colorFn) {
  const color = value === null ? getNeutralColor() : colorFn(value);
  const label = formatValue(variable, value);
  return { color, label };
}

export function buildCragIcon(value, variable, colorFn) {
  const { color, label } = markerAppearance(value, variable, colorFn);
  return `<div class="crag-marker-icon" style="background:${color}">${label}</div>`;
}

export function createClusterIcon(values, variable, colorFn) {
  const { color, label } = markerAppearance(average(values), variable, colorFn);
  return `<div class="cluster-icon" style="background:${color}">${label}</div>`;
}

export function resolveCragValue(forecast, variable, timeIndex) {
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';
  const value = forecast ? forecast.hourly[valueKey][timeIndex] : null;
  return value ?? null;
}

export function updateMarkerColors(view, weatherByCragId, variable, timeIndex) {
  const colorFn = colorForVariable(variable);
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';
  view.activeColorFn = colorFn;
  view.activeVariable = variable;

  for (const [cragId, marker] of view.markersByCragId) {
    const forecast = weatherByCragId.get(cragId);
    const value = forecast ? forecast.hourly[valueKey][timeIndex] : null;
    marker.cragValue = value ?? null;
    marker.setIcon(buildCragIcon(marker.cragValue, variable, colorFn));
  }

  view.markerCluster.refreshClusters();
}

export function focusCrag(view, crag) {
  view.map.setView([crag.lat, crag.lon], 14);
  view.map.fire('crag:selected', { crag });
}

export function createEmitter() {
  const listeners = new Map();
  return {
    on(name, fn) {
      if (!listeners.has(name)) listeners.set(name, new Set());
      listeners.get(name).add(fn);
    },
    emit(name, payload) {
      for (const fn of listeners.get(name) ?? []) fn(payload);
    },
  };
}
