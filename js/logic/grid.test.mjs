// js/logic/grid.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildGridPoints } from './grid.js';

const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };

test('generates points at the given step spacing, inclusive of both edges', () => {
  const points = buildGridPoints({ south: 50, west: 0, north: 52, east: 2 }, 1);
  const lats = [...new Set(points.map((p) => p.lat))].sort((a, b) => a - b);
  const lons = [...new Set(points.map((p) => p.lon))].sort((a, b) => a - b);
  assert.deepEqual(lats, [50, 51, 52]);
  assert.deepEqual(lons, [0, 1, 2]);
  assert.equal(points.length, 9); // 3 lats x 3 lons
});

test('defaults to 1 degree spacing', () => {
  const points = buildGridPoints({ south: 50, west: 0, north: 51, east: 1 });
  assert.equal(points.length, 4);
});

test('covers the full UK bounding box with a plausible point count', () => {
  const points = buildGridPoints(UK_BBOX, 1);
  // ~12 lat steps x ~11 lon steps
  assert.ok(points.length > 100 && points.length < 200, `expected 100-200 points, got ${points.length}`);
  for (const point of points) {
    assert.ok(point.lat >= UK_BBOX.south && point.lat <= UK_BBOX.north);
    assert.ok(point.lon >= UK_BBOX.west && point.lon <= UK_BBOX.east);
  }
});
