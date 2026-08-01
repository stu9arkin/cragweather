// js/heatmapView.js
import { getNeutralColor, colorForVariable } from './logic/colorScale.js';

export function createHeatmapView(gridPoints, stepDeg = 1) {
  const layer = L.layerGroup();
  const latBoundsByValue = axisBounds(gridPoints.map((p) => p.lat), stepDeg);
  const lonBoundsByValue = axisBounds(gridPoints.map((p) => p.lon), stepDeg);

  const cellsByIndex = gridPoints.map((point) => {
    const [south, north] = latBoundsByValue.get(point.lat);
    const [west, east] = lonBoundsByValue.get(point.lon);
    const bounds = [
      [south, west],
      [north, east],
    ];
    const rect = L.rectangle(bounds, {
      color: 'transparent',
      weight: 0,
      fillColor: getNeutralColor(),
      fillOpacity: 0.35,
      interactive: false,
    });
    rect.addTo(layer);
    return rect;
  });
  return { layer, cellsByIndex, gridPoints };
}

// Builds a Map from each unique axis value to its [low, high] cell bound,
// so adjacent cells share an exact boundary at the midpoint between
// neighbors -- even when the final step is a different size than stepDeg
// (e.g. the UK bbox's north/east edges, which don't land on an even
// multiple of stepDeg from south/west).
function axisBounds(values, stepDeg) {
  const sorted = [...new Set(values)].sort((a, b) => a - b);
  const half = stepDeg / 2;
  const boundsByValue = new Map();
  sorted.forEach((value, i) => {
    const low = i === 0 ? value - half : (sorted[i - 1] + value) / 2;
    const high = i === sorted.length - 1 ? value + half : (sorted[i + 1] + value) / 2;
    boundsByValue.set(value, [low, high]);
  });
  return boundsByValue;
}

export function updateHeatmapColors(heatmapView, gridWeather, variable, timeIndex) {
  const colorFn = colorForVariable(variable);
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';

  heatmapView.cellsByIndex.forEach((rect, i) => {
    const forecast = gridWeather[i];
    const value = forecast ? forecast.hourly[valueKey][timeIndex] : null;
    rect.setStyle({ fillColor: colorFn(value) });
  });
}

export function setHeatmapVisible(heatmapView, map, visible) {
  if (visible) {
    heatmapView.layer.addTo(map);
  } else {
    map.removeLayer(heatmapView.layer);
  }
}
