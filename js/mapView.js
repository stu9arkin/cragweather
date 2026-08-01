// js/mapView.js
import { getNeutralColor, colorForVariable } from './logic/colorScale.js';
import { average } from './logic/clusterAggregate.js';

export function createMapView(mapElementId, crags) {
  const view = {
    activeColorFn: () => getNeutralColor(),
  };

  const map = L.map(mapElementId, { center: [54.5, -3.5], zoom: 6 });

  L.tileLayer('https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png', {
    attribution: '&copy; OpenStreetMap contributors',
    maxZoom: 19,
  }).addTo(map);

  const markerCluster = L.markerClusterGroup({
    iconCreateFunction: (cluster) => createClusterIcon(cluster, view),
  });

  const markersByCragId = new Map();
  for (const crag of crags) {
    const marker = L.circleMarker([crag.lat, crag.lon], {
      radius: 7,
      color: '#333',
      weight: 1,
      fillColor: getNeutralColor(),
      fillOpacity: 0.9,
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

function createClusterIcon(cluster, view) {
  const values = cluster.getAllChildMarkers().map((marker) => marker.cragValue);
  const avg = average(values);
  const color = avg === null ? getNeutralColor() : view.activeColorFn(avg);
  const count = cluster.getChildCount();
  return L.divIcon({
    html: `<div class="cluster-icon" style="background:${color}">${count}</div>`,
    className: 'crag-cluster-icon',
    iconSize: L.point(36, 36),
  });
}

export function updateMarkerColors(view, weatherByCragId, variable, timeIndex) {
  const colorFn = colorForVariable(variable);
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';
  view.activeColorFn = colorFn;

  for (const [cragId, marker] of view.markersByCragId) {
    const forecast = weatherByCragId.get(cragId);
    const value = forecast ? forecast.hourly[valueKey][timeIndex] : null;
    marker.cragValue = value ?? null;
    marker.setStyle({ fillColor: colorFn(value) });
  }

  view.markerCluster.refreshClusters();
}
