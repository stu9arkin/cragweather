import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { elementToCrag, elementsToCrags } from './transform.mjs';

const fixturePath = fileURLToPath(
  new URL('./__fixtures__/sample-overpass-response.json', import.meta.url)
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

test('elementToCrag extracts a named outdoor node crag', () => {
  const crag = elementToCrag(fixture.elements[0]); // Stanage Edge node
  assert.equal(crag.id, 'node/1001');
  assert.equal(crag.name, 'Stanage Edge');
  assert.equal(crag.lat, 53.3403);
  assert.equal(crag.lon, -1.6294);
  assert.equal(crag.rock, 'gritstone');
  assert.deepEqual(crag.climbingStyles, ['trad']);
});

test('elementToCrag reads coordinates from a way\'s center', () => {
  const crag = elementToCrag(fixture.elements[1]); // Stanage Edge way
  assert.equal(crag.lat, 53.3405);
  assert.equal(crag.lon, -1.6290);
  assert.deepEqual(crag.climbingStyles, ['sport', 'trad']);
});

test('elementToCrag returns null for indoor venues', () => {
  assert.equal(elementToCrag(fixture.elements[2]), null); // City Climb Centre
});

test('elementToCrag returns null for elements with no name', () => {
  assert.equal(elementToCrag(fixture.elements[3]), null);
});

test('elementToCrag handles natural=cliff crags', () => {
  const crag = elementToCrag(fixture.elements[4]); // Dumbarton Rock
  assert.equal(crag.name, 'Dumbarton Rock');
  assert.equal(crag.rock, 'basalt');
  assert.equal(crag.climbingStyles, undefined);
});

test('elementsToCrags maps and drops nulls, but does not dedupe', () => {
  // 5 fixture elements: Stanage node + Stanage way (both valid, dedup is a
  // separate step handled in Task 5/7, not here), 1 indoor (dropped),
  // 1 unnamed (dropped), 1 Dumbarton Rock (valid) => 3 results
  const crags = elementsToCrags(fixture.elements);
  assert.equal(crags.length, 3);
  assert.deepEqual(
    crags.map((c) => c.name).sort(),
    ['Dumbarton Rock', 'Stanage Edge', 'Stanage Edge']
  );
});
