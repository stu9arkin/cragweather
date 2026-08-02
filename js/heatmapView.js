// js/heatmapView.js
import { interpolateGrid } from './logic/gridInterpolate.js';
import { gridToImageData } from './logic/gridToImageData.js';

const MAX_CANVAS_DIMENSION = 600;
const HEATMAP_OPACITY = 0.35;
const BLANK_IMAGE_URL =
  'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';

export function createHeatmapView(gridPoints, bbox) {
  const { width, height } = canvasDimensions(bbox, MAX_CANVAS_DIMENSION);
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');

  const bounds = [
    [bbox.south, bbox.west],
    [bbox.north, bbox.east],
  ];
  const overlay = L.imageOverlay(BLANK_IMAGE_URL, bounds, {
    opacity: HEATMAP_OPACITY,
    interactive: false,
  });

  return { overlay, canvas, ctx, gridPoints, bbox };
}

export function updateHeatmapColors(heatmapView, gridWeather, variable, timeIndex) {
  const { canvas, ctx, gridPoints, bbox } = heatmapView;
  const valueKey = variable === 'rainfall' ? 'rainfall' : 'temperature';

  const values = gridPoints.map((_, i) => {
    const forecast = gridWeather[i];
    return forecast ? forecast.hourly[valueKey][timeIndex] : null;
  });

  const interpolated = interpolateGrid({
    gridPoints,
    values,
    bbox,
    width: canvas.width,
    height: canvas.height,
  });
  const rgba = gridToImageData(interpolated, variable);

  ctx.putImageData(new ImageData(rgba, canvas.width, canvas.height), 0, 0);
  heatmapView.overlay.setUrl(canvas.toDataURL());
}

export function setHeatmapVisible(heatmapView, map, visible) {
  if (visible) {
    heatmapView.overlay.addTo(map);
  } else {
    map.removeLayer(heatmapView.overlay);
  }
}

// Picks raster pixel dimensions matching bbox's aspect ratio, capped at
// maxDimension on the longer edge -- big enough to look smooth when
// Leaflet scales the overlay up while zoomed in, small enough to redraw
// quickly on each render().
export function canvasDimensions(bbox, maxDimension) {
  const latSpan = bbox.north - bbox.south;
  const lonSpan = bbox.east - bbox.west;
  if (latSpan <= 0 || lonSpan <= 0) {
    throw new Error(
      `canvasDimensions: bbox must have positive area (got latSpan=${latSpan}, lonSpan=${lonSpan})`
    );
  }
  if (lonSpan >= latSpan) {
    return { width: maxDimension, height: Math.round((maxDimension * latSpan) / lonSpan) };
  }
  return { width: Math.round((maxDimension * lonSpan) / latSpan), height: maxDimension };
}
