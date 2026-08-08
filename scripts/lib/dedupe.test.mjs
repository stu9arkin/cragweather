// scripts/lib/dedupe.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { dedupeCrags } from './dedupe.mjs';

test('merges same-name crags within the distance threshold', () => {
  const crags = [
    { id: 'node/1', name: 'Stanage Edge', lat: 53.3403, lon: -1.6294 },
    { id: 'way/2', name: 'Stanage Edge', lat: 53.3405, lon: -1.629 }, // ~34m away
  ];
  const result = dedupeCrags(crags);
  assert.equal(result.length, 1);
  assert.equal(result[0].id, 'node/1'); // first occurrence wins
});

test('merges same-name crags ~900m apart under the raised 1500m default (issue #28)', () => {
  const crags = [
    { id: 'way/1', name: 'Curbar Edge', lat: 53.2727, lon: -1.6317 },
    { id: 'way/2', name: 'Curbar Edge', lat: 53.2808, lon: -1.6317 }, // ~901m away
  ];
  const result = dedupeCrags(crags);
  assert.equal(result.length, 1); // would NOT have merged under the old 250m default
  assert.equal(result[0].id, 'way/1'); // first occurrence wins
});

test('keeps same-name crags that are far apart', () => {
  const crags = [
    { id: 'node/1', name: 'Black Rocks', lat: 53.0806, lon: -1.5087 }, // Derbyshire
    { id: 'node/2', name: 'Black Rocks', lat: 50.216, lon: -5.15 }, // Cornwall, different crag
  ];
  const result = dedupeCrags(crags);
  assert.equal(result.length, 2);
});

test('keeps differently-named crags that are close together', () => {
  const crags = [
    { id: 'node/1', name: 'Stanage Popular End', lat: 53.34, lon: -1.629 },
    { id: 'node/2', name: 'Stanage Plantation', lat: 53.3401, lon: -1.6291 },
  ];
  const result = dedupeCrags(crags);
  assert.equal(result.length, 2);
});

test('name matching is case-insensitive', () => {
  const crags = [
    { id: 'node/1', name: 'Stanage Edge', lat: 53.3403, lon: -1.6294 },
    { id: 'way/2', name: 'STANAGE EDGE', lat: 53.3405, lon: -1.629 },
  ];
  const result = dedupeCrags(crags);
  assert.equal(result.length, 1);
});
