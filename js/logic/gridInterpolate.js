// js/logic/gridInterpolate.js

// Interpolates a scattered value grid (as produced by buildGridPoints, one
// value per point) onto a fixed-resolution raster covering `bbox`, using
// bilinear interpolation between the four nearest surrounding grid points.
// Query points outside the grid's outer row/column clamp to the nearest
// edge rather than extrapolating. If any of the four corners needed for a
// pixel is `null` (missing weather data), that pixel's output is NaN
// (no-data / render transparent).
export function interpolateGrid({ gridPoints, values, bbox, width, height }) {
  const lats = uniqueSorted(gridPoints.map((p) => p.lat));
  const lons = uniqueSorted(gridPoints.map((p) => p.lon));
  const valueAt = buildLookup(gridPoints, values);

  const data = new Float64Array(width * height);
  for (let py = 0; py < height; py++) {
    const lat = bbox.north - ((py + 0.5) / height) * (bbox.north - bbox.south);
    const latIdx = clampedNeighbors(lats, lat);
    for (let px = 0; px < width; px++) {
      const lon = bbox.west + ((px + 0.5) / width) * (bbox.east - bbox.west);
      const lonIdx = clampedNeighbors(lons, lon);
      data[py * width + px] = bilinear(valueAt, lats, lons, latIdx, lonIdx, lat, lon);
    }
  }
  return { width, height, data };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

function buildLookup(gridPoints, values) {
  const map = new Map();
  gridPoints.forEach((point, i) => {
    map.set(`${point.lat},${point.lon}`, values[i]);
  });
  return (lat, lon) => {
    const value = map.get(`${lat},${lon}`);
    return value === undefined ? null : value;
  };
}

// Finds the pair of indices in a sorted array that bracket `value`,
// clamping to the first/last index when `value` is outside the array's
// range instead of extrapolating.
function clampedNeighbors(sortedValues, value) {
  if (value <= sortedValues[0]) return [0, 0];
  const last = sortedValues.length - 1;
  if (value >= sortedValues[last]) return [last, last];
  for (let i = 0; i < last; i++) {
    if (value >= sortedValues[i] && value <= sortedValues[i + 1]) {
      return [i, i + 1];
    }
  }
  return [0, 0];
}

function bilinear(valueAt, lats, lons, [latI0, latI1], [lonI0, lonI1], lat, lon) {
  const v00 = valueAt(lats[latI0], lons[lonI0]);
  const v01 = valueAt(lats[latI0], lons[lonI1]);
  const v10 = valueAt(lats[latI1], lons[lonI0]);
  const v11 = valueAt(lats[latI1], lons[lonI1]);
  if (v00 === null || v01 === null || v10 === null || v11 === null) {
    return NaN;
  }

  const tLat = latI0 === latI1 ? 0 : (lat - lats[latI0]) / (lats[latI1] - lats[latI0]);
  const tLon = lonI0 === lonI1 ? 0 : (lon - lons[lonI0]) / (lons[lonI1] - lons[lonI0]);

  const top = v00 + (v01 - v00) * tLon;
  const bottom = v10 + (v11 - v10) * tLon;
  return top + (bottom - top) * tLat;
}
