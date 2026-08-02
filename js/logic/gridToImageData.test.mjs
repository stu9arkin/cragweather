// js/logic/gridToImageData.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { gridToImageData } from './gridToImageData.js';

test('maps a defined value through colorForVariable into opaque RGBA bytes', () => {
  // temperatureColor(10) resolves exactly to the 10C stop's color, #f7f7f7
  // (r=247, g=247, b=247) -- see js/logic/colorScale.js's TEMPERATURE_STOPS.
  const interpolated = { width: 1, height: 1, data: Float64Array.from([10]) };
  const rgba = gridToImageData(interpolated, 'temperature');
  assert.equal(rgba.length, 4);
  assert.deepEqual(Array.from(rgba), [247, 247, 247, 255]);
});

test('renders NaN (no-data) pixels fully transparent instead of any color', () => {
  const interpolated = { width: 1, height: 1, data: Float64Array.from([NaN]) };
  const rgba = gridToImageData(interpolated, 'temperature');
  assert.deepEqual(Array.from(rgba), [0, 0, 0, 0]);
});

test('produces one RGBA quadruplet per pixel, in row-major order', () => {
  const interpolated = { width: 2, height: 1, data: Float64Array.from([10, NaN]) };
  const rgba = gridToImageData(interpolated, 'temperature');
  assert.equal(rgba.length, 8);
  assert.deepEqual(Array.from(rgba.slice(0, 4)), [247, 247, 247, 255]);
  assert.deepEqual(Array.from(rgba.slice(4, 8)), [0, 0, 0, 0]);
});
