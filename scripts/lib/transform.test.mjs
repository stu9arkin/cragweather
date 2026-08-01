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

test('elementToCrag returns null for building=commercial + leisure=fitness_centre (real-world gym mistagging)', () => {
  assert.equal(elementToCrag(fixture.elements[5]), null); // Redpoint Bristol
});

test('elementToCrag returns null for shop=outdoor (gear shop, not a crag)', () => {
  assert.equal(elementToCrag(fixture.elements[6]), null); // Go Outdoors
});

test('elementToCrag returns null for climbing_wall=indoor', () => {
  assert.equal(elementToCrag(fixture.elements[7]), null); // BlocHaus Climbing
});

test('elementToCrag returns null for any element with a building tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9001,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Some Warehouse Wall', sport: 'climbing', building: 'warehouse' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for any element with a shop tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9002,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Climbers Shop', sport: 'climbing', shop: 'sports' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for disused:leisure=sports_centre, in isolation', () => {
  const element = {
    type: 'node',
    id: 9003,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Old Sports Centre', sport: 'climbing', 'disused:leisure': 'sports_centre' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for amenity=community_centre, in isolation (16th Kilcock Scout Group)', () => {
  assert.equal(elementToCrag(fixture.elements[8]), null); // 16th Kilcock Scout Group
});

test('elementToCrag returns null for leisure values like climbing_hall, high_ropes_course, sports_hall', () => {
  for (const leisure of ['climbing_hall', 'high_ropes_course', 'sports_hall']) {
    const element = {
      type: 'node',
      id: 9004,
      lat: 51.0,
      lon: -1.0,
      tags: { name: `Test ${leisure}`, sport: 'climbing', leisure },
    };
    assert.equal(elementToCrag(element), null, `expected leisure=${leisure} to be filtered`);
  }
});

test('elementsToCrags maps and drops nulls, but does not dedupe', () => {
  // 9 fixture elements: Stanage node + Stanage way (both valid, dedup is a
  // separate step handled in Task 5/7, not here), 1 indoor (dropped),
  // 1 unnamed (dropped), 1 Dumbarton Rock (valid), 4 real-world indoor
  // mistagging shapes (building+leisure, shop, climbing_wall, amenity
  // community_centre - all dropped)
  // => 3 results
  const crags = elementsToCrags(fixture.elements);
  assert.equal(crags.length, 3);
  assert.deepEqual(
    crags.map((c) => c.name).sort(),
    ['Dumbarton Rock', 'Stanage Edge', 'Stanage Edge']
  );
});
