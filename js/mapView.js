// js/mapView.js
import { getNeutralColor, colorForVariable, formatValue } from './logic/colorScale.js';
import { average } from './logic/clusterAggregate.js';

export function createMapView(mapElementId, crags) {
  const view = {
    activeColorFn: () => getNeutralColor(),
    activeVariable: 'temperature',
  };

  const map = L.map(mapElementId, { center: [54.5, -3.5], zoom: 6 });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const markerCluster = L.markerClusterGroup({
    iconCreateFunction: (cluster) => createClusterIcon(cluster, view),
    // Tuned against the real 492-crag dataset (issue #12): radius 20 keeps
    // the worst-case cluster near ~110 crags instead of the pre-tuning
    // ~155. disableClusteringAtZoom relies on the tile layer's maxZoom
    // (19, above) being >= 11 for clustering to actually turn off.
    maxClusterRadius: 20,
    disableClusteringAtZoom: 11,
  });

  const markersByCragId = new Map();
  for (const crag of crags) {
    const marker = L.marker([crag.lat, crag.lon], {
      icon: buildCragIcon(null, view.activeVariable, view.activeColorFn),
      title: crag.name,
    });
    marker.cragId = crag.id;
    marker.cragValue = null;
    marker.on('click', () => map.fire('crag:selected', { crag }));
    markersByCragId.set(crag.id, marker);
    markerCluster.addLayer(marker);
  }
  map.addLayer(markerCluster);

  view.map = map;
  view.markerCluster = markerCluster;
  view.markersByCragId = markersByCragId;
  return view;
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
