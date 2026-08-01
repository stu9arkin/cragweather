// js/logic/weatherCodeIcon.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { weatherCodeToIcon } from './weatherCodeIcon.js';

test('maps known WMO codes to an icon and label', () => {
  assert.deepEqual(weatherCodeToIcon(0), { icon: '☀️', label: 'Clear sky' });
  assert.deepEqual(weatherCodeToIcon(61), { icon: '🌦️', label: 'Slight rain' });
  assert.deepEqual(weatherCodeToIcon(95), { icon: '⛈️', label: 'Thunderstorm' });
});

test('falls back to an unknown marker for an unrecognised code', () => {
  const result = weatherCodeToIcon(9999);
  assert.equal(result.label, 'Unknown');
});
