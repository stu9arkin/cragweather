// js/heatmapView.js
import { getNeutralColor, temperatureColor, rainfallColor } from './logic/colorScale.js';

export function createHeatmapView(map, gridPoints, stepDeg = 1) {
  const layer = L.layerGroup();
  const half = stepDeg / 2;
  const cellsByIndex = gridPoints.map((point) => {
    const bounds = [
      [point.lat - half, point.lon - half],
      [point.lat + half, point.lon + half],
    ];
    const rect = L.rectangle(bounds, {
      color: 'transparent',
      weight: 0,
      fillColor: getNeutralColor(),
      fillOpacity: 0.35,
    });
    rect.addTo(layer);
    return rect;
  });
  return { layer, cellsByIndex, gridPoints };
}

export function updateHeatmapColors(heatmapView, gridWeather, variable, timeIndex) {
  const colorFn = variable === 'rainfall' ? rainfallColor : temperatureColor;
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';

  heatmapView.cellsByIndex.forEach((rect, i) => {
    const forecast = gridWeather[i];
    const value = forecast ? forecast.hourly[valueKey][timeIndex] : null;
    rect.setStyle({ fillColor: value === null || value === undefined ? getNeutralColor() : colorFn(value) });
  });
}

export function setHeatmapVisible(heatmapView, map, visible) {
  if (visible) {
    heatmapView.layer.addTo(map);
  } else {
    map.removeLayer(heatmapView.layer);
  }
}
