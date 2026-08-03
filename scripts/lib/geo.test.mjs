import { test } from 'node:test';
import assert from 'node:assert/strict';
import { elementCoord, haversineMeters } from './geo.mjs';

test('distance between identical points is 0', () => {
  assert.equal(haversineMeters(53.34, -1.62, 53.34, -1.62), 0);
});

test('distance between two known points is approximately correct', () => {
  // Stanage Edge car park area, two points ~34m apart
  const distance = haversineMeters(53.3403, -1.6294, 53.3405, -1.6290);
  assert.ok(distance > 25 && distance < 45, `expected ~34m, got ${distance}`);
});

test('distance between London and Edinburgh is approximately 530km', () => {
  const distance = haversineMeters(51.5074, -0.1278, 55.9533, -3.1883);
  const km = distance / 1000;
  assert.ok(km > 520 && km < 545, `expected ~530km, got ${km}km`);
});

test('elementCoord reads lat/lon from a node', () => {
  assert.deepEqual(elementCoord({ type: 'node', lat: 53.34, lon: -1.62 }), { lat: 53.34, lon: -1.62 });
});

test('elementCoord reads lat/lon from a way center', () => {
  assert.deepEqual(elementCoord({ type: 'way', center: { lat: 53.34, lon: -1.62 } }), { lat: 53.34, lon: -1.62 });
});

test('elementCoord returns null when neither is present', () => {
  assert.equal(elementCoord({ type: 'way' }), null);
});
