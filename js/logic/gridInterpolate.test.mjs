// js/logic/gridInterpolate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { interpolateGrid } from './gridInterpolate.js';

// A 2x2 grid: lats [50, 51], lons [-2, -1], in buildGridPoints order
// (outer loop ascending lat, inner loop ascending lon).
const GRID_POINTS = [
  { lat: 50, lon: -2 }, // value 10
  { lat: 50, lon: -1 }, // value 20
  { lat: 51, lon: -2 }, // value 30
  { lat: 51, lon: -1 }, // value 40
];
const VALUES = [10, 20, 30, 40];
const BBOX = { south: 50, west: -2, north: 51, east: -1 };

test('bilinear-interpolates a 2x2 grid onto a 2x2 raster matching the grid extent exactly', () => {
  const result = interpolateGrid({ gridPoints: GRID_POINTS, values: VALUES, bbox: BBOX, width: 2, height: 2 });
  assert.equal(result.width, 2);
  assert.equal(result.height, 2);
  assert.equal(result.data.length, 4);
  // Pixel centers land at (lat 50.75, lon -1.75), (50.75, -1.25), (50.25, -1.75), (50.25, -1.25)
  // -- worked out by hand from the bilinear formula against the 10/20/30/40 corners above.
  assertClose(result.data[0], 27.5); // row 0 (north, py=0), col 0
  assertClose(result.data[1], 32.5); // row 0, col 1
  assertClose(result.data[2], 17.5); // row 1 (south, py=1), col 0
  assertClose(result.data[3], 22.5); // row 1, col 1
});

test('query points beyond the outer grid row/column clamp to the nearest edge instead of extrapolating', () => {
  // Same 2x2 value grid, but the raster's bbox extends far beyond the grid's
  // lat range (50-51) on both sides, with 5 rows so we can sample clearly
  // above, at, and below the grid extent. Lon spans exactly -2..-1 (1 pixel
  // wide), so every row samples at lon -1.5 (tLon = 0.5) for a simple check.
  const wideBbox = { south: 0, west: -2, north: 100, east: -1 };
  const result = interpolateGrid({ gridPoints: GRID_POINTS, values: VALUES, bbox: wideBbox, width: 1, height: 5 });
  // py=0 -> lat=90 (above the grid's north edge, 51) -> clamps to the top
  // row (30, 40), lon-interpolated at tLon=0.5 -> 35.
  assertClose(result.data[0], 35);
  // py=4 -> lat=10 (below the grid's south edge, 50) -> clamps to the
  // bottom row (10, 20), lon-interpolated at tLon=0.5 -> 15.
  assertClose(result.data[4], 15);
});

test('a pixel whose interpolation needs a null grid corner is NaN, not a fabricated value', () => {
  const valuesWithGap = [null, 20, 30, 40];
  const result = interpolateGrid({ gridPoints: GRID_POINTS, values: valuesWithGap, bbox: BBOX, width: 1, height: 1 });
  assert.ok(Number.isNaN(result.data[0]), `expected NaN, got ${result.data[0]}`);
});

function assertClose(actual, expected, epsilon = 1e-9) {
  assert.ok(Math.abs(actual - expected) < epsilon, `expected ${actual} to be close to ${expected}`);
}
