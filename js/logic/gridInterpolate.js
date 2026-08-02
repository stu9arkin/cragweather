// js/logic/gridInterpolate.js

// Interpolates a scattered value grid (as produced by buildGridPoints, one
// value per point) onto a fixed-resolution raster covering `bbox`, using
// bilinear interpolation between the four nearest surrounding grid points.
// Query points outside the grid's outer row/column clamp to the nearest
// edge rather than extrapolating. If any of the four corners needed for a
// pixel is `null` (missing weather data), that pixel's output is NaN
// (no-data / render transparent).
//
// Performance note: this runs once per pixel of the raster (hundreds of
// thousands of times for a full-UK render), so per-pixel work is kept to
// plain arithmetic and array indexing -- no string keys, no Map lookups, no
// linear scans. The lon bracket + fractional weight only depend on a
// pixel's x-coordinate, so they're precomputed once per column and reused
// across every row, and both lat/lon bracket lookups use binary search
// instead of scanning the sorted coordinate arrays.
export function interpolateGrid({ gridPoints, values, bbox, width, height }) {
  const lats = uniqueSorted(gridPoints.map((p) => p.lat));
  const lons = uniqueSorted(gridPoints.map((p) => p.lon));
  const valueGrid = buildValueGrid(gridPoints, values, lats, lons);
  const numLons = lons.length;

  // The lon bracket + tLon fraction depend only on px, not py -- precompute
  // once per column instead of once per pixel.
  const lonIdx0 = new Int32Array(width);
  const lonIdx1 = new Int32Array(width);
  const tLonByCol = new Float64Array(width);
  for (let px = 0; px < width; px++) {
    const lon = bbox.west + ((px + 0.5) / width) * (bbox.east - bbox.west);
    const [lonI0, lonI1] = clampedNeighbors(lons, lon);
    lonIdx0[px] = lonI0;
    lonIdx1[px] = lonI1;
    tLonByCol[px] = lonI0 === lonI1 ? 0 : (lon - lons[lonI0]) / (lons[lonI1] - lons[lonI0]);
  }

  const data = new Float64Array(width * height);
  for (let py = 0; py < height; py++) {
    const lat = bbox.north - ((py + 0.5) / height) * (bbox.north - bbox.south);
    const [latI0, latI1] = clampedNeighbors(lats, lat);
    const tLat = latI0 === latI1 ? 0 : (lat - lats[latI0]) / (lats[latI1] - lats[latI0]);
    const rowBase0 = latI0 * numLons;
    const rowBase1 = latI1 * numLons;
    const rowOffset = py * width;

    for (let px = 0; px < width; px++) {
      const lonI0 = lonIdx0[px];
      const lonI1 = lonIdx1[px];
      const tLon = tLonByCol[px];

      const v00 = valueGrid[rowBase0 + lonI0];
      const v01 = valueGrid[rowBase0 + lonI1];
      const v10 = valueGrid[rowBase1 + lonI0];
      const v11 = valueGrid[rowBase1 + lonI1];

      if (Number.isNaN(v00) || Number.isNaN(v01) || Number.isNaN(v10) || Number.isNaN(v11)) {
        data[rowOffset + px] = NaN;
        continue;
      }

      const top = v00 + (v01 - v00) * tLon;
      const bottom = v10 + (v11 - v10) * tLon;
      data[rowOffset + px] = top + (bottom - top) * tLat;
    }
  }
  return { width, height, data };
}

function uniqueSorted(values) {
  return [...new Set(values)].sort((a, b) => a - b);
}

// Dense lat x lon grid of values, indexed by latIdx * lons.length + lonIdx,
// so per-pixel corner lookups are a plain array index instead of a
// string-keyed Map.get. Entries are NaN both for grid points whose value is
// `null` (missing weather data) and for any (lat, lon) combination that
// isn't present in gridPoints at all -- matching the old Map-based
// lookup's fallback of "not found -> null -> NaN in bilinear()" exactly.
function buildValueGrid(gridPoints, values, lats, lons) {
  const latIndex = new Map();
  lats.forEach((lat, i) => latIndex.set(lat, i));
  const lonIndex = new Map();
  lons.forEach((lon, i) => lonIndex.set(lon, i));

  const grid = new Float64Array(lats.length * lons.length).fill(NaN);
  gridPoints.forEach((point, i) => {
    const latIdx = latIndex.get(point.lat);
    const lonIdx = lonIndex.get(point.lon);
    const value = values[i];
    grid[latIdx * lons.length + lonIdx] = value === null || value === undefined ? NaN : value;
  });
  return grid;
}

// Finds the pair of indices in a sorted array that bracket `value`,
// clamping to the first/last index when `value` is outside the array's
// range instead of extrapolating. Uses binary search: for an interior
// value, this locates j, the smallest index with sortedValues[j] >= value,
// and returns [j - 1, j] -- equivalent to (and exactly reproducing,
// including the tie-break at exact matches on an interior grid line) the
// original linear scan's "smallest i with sortedValues[i] <= value <=
// sortedValues[i + 1]".
function clampedNeighbors(sortedValues, value) {
  const last = sortedValues.length - 1;
  if (value <= sortedValues[0]) return [0, 0];
  if (value >= sortedValues[last]) return [last, last];

  let lo = 1;
  let hi = last;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    if (sortedValues[mid] >= value) {
      hi = mid;
    } else {
      lo = mid + 1;
    }
  }
  return [lo - 1, lo];
}
