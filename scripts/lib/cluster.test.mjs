import { test } from 'node:test';
import assert from 'node:assert/strict';
import { isSeed, filterToSeedClusters } from './cluster.mjs';

test('isSeed is true for sport=climbing', () => {
  assert.equal(isSeed({ sport: 'climbing' }), true);
});

test('isSeed is true for any climbing=* tag', () => {
  assert.equal(isSeed({ climbing: 'yes' }), true);
});

test('isSeed is true when source:name references a climbing guide', () => {
  assert.equal(isSeed({ 'source:name': 'Leicestershireclimbs.f9.co.uk website' }), true);
});

test('isSeed is false for a plain named rock with no climbing signal', () => {
  assert.equal(isSeed({ name: 'Middle Stone', natural: 'bare_rock', source: 'survey' }), false);
});

test('isSeed is false for climbing=no (explicitly not a climbing feature)', () => {
  assert.equal(isSeed({ climbing: 'no' }), false);
});

test('filterToSeedClusters keeps a lone seed element', () => {
  const elements = [
    { type: 'node', id: 1, lat: 53.0, lon: -1.0, tags: { name: 'Solo Crag', sport: 'climbing' } },
  ];
  const result = filterToSeedClusters(elements);
  assert.equal(result.length, 1);
});

test('filterToSeedClusters drops a named rock with no seed nearby', () => {
  const elements = [
    { type: 'node', id: 1, lat: 60.0, lon: -1.0, tags: { name: 'Lonely Skerry', natural: 'bare_rock' } },
  ];
  const result = filterToSeedClusters(elements);
  assert.equal(result.length, 0);
});

test('filterToSeedClusters pulls in a nearby non-seed element within the threshold', () => {
  const elements = [
    { type: 'node', id: 1, lat: 53.0, lon: -1.0, tags: { name: 'Seed Crag', sport: 'climbing' } },
    { type: 'node', id: 2, lat: 53.001, lon: -1.0, tags: { name: 'Nearby Rock', natural: 'bare_rock' } }, // ~111m north
  ];
  const result = filterToSeedClusters(elements, 400);
  assert.equal(result.length, 2);
});

test('filterToSeedClusters does not pull in a non-seed element beyond the threshold', () => {
  const elements = [
    { type: 'node', id: 1, lat: 53.0, lon: -1.0, tags: { name: 'Seed Crag', sport: 'climbing' } },
    { type: 'node', id: 2, lat: 53.01, lon: -1.0, tags: { name: 'Distant Rock', natural: 'bare_rock' } }, // ~1.1km north
  ];
  const result = filterToSeedClusters(elements, 400);
  assert.equal(result.length, 1);
  assert.equal(result[0].tags.name, 'Seed Crag');
});

test('filterToSeedClusters transitively pulls in a chain via an intermediate seed', () => {
  const elements = [
    { type: 'node', id: 1, lat: 53.0, lon: -1.0, tags: { name: 'A', natural: 'bare_rock' } },
    { type: 'node', id: 2, lat: 53.0027, lon: -1.0, tags: { name: 'B (seed)', sport: 'climbing' } }, // ~300m from A
    { type: 'node', id: 3, lat: 53.0054, lon: -1.0, tags: { name: 'C', natural: 'bare_rock' } }, // ~300m from B, ~600m from A
  ];
  const result = filterToSeedClusters(elements, 400);
  assert.equal(result.length, 3);
});

test('filterToSeedClusters drops an entire cluster with no seed', () => {
  const elements = [
    { type: 'node', id: 1, lat: 53.0, lon: -1.0, tags: { name: 'X', natural: 'bare_rock' } },
    { type: 'node', id: 2, lat: 53.001, lon: -1.0, tags: { name: 'Y', natural: 'cliff' } },
  ];
  const result = filterToSeedClusters(elements, 400);
  assert.equal(result.length, 0);
});

test('filterToSeedClusters recovers the real-world Cademan Wood crag cluster (issue #11)', () => {
  // Actual tags/coordinates captured live from OSM (August 2026). Turry Tor,
  // Pinacle Crag, Hob's Hole and Reg's Crack are seeds via source:name
  // referencing the Leicestershire climbing guide; High Cademan, Twenty
  // Steps, Calvary Rock and Grimley's Rock carry no climbing signal at all
  // and are only included because they cluster with those seeds.
  const elements = [
    { type: 'way', id: 548194484, center: { lat: 52.7480424, lon: -1.3474601 }, tags: { name: 'High Cademan', natural: 'bare_rock', source: 'survey' } },
    { type: 'way', id: 548253649, center: { lat: 52.7495403, lon: -1.3581288 }, tags: { name: 'Turry Tor', natural: 'bare_rock', source: 'Bing;survey', 'source:name': 'Leicestershireclimbs.f9.co.uk website' } },
    { type: 'way', id: 792237373, center: { lat: 52.7497567, lon: -1.3584743 }, tags: { name: 'Twenty Steps', natural: 'bare_rock', source: 'Bing;survey' } },
    { type: 'way', id: 792237379, center: { lat: 52.7500648, lon: -1.3590658 }, tags: { name: 'Calvary Rock', natural: 'bare_rock', source: 'Bing;survey' } },
    { type: 'way', id: 792243428, center: { lat: 52.7494493, lon: -1.3514994 }, tags: { name: 'Pinacle Crag', natural: 'bare_rock', source: 'survey', 'source:name': 'Leicestershireclimbs.f9.co.uk website' } },
    { type: 'way', id: 844799021, center: { lat: 52.7530555, lon: -1.3573377 }, tags: { name: "Hob's Hole", natural: 'bare_rock', source: 'Bing;survey', 'source:name': 'Leicestershireclimbs.f9.co.uk website' } },
    { type: 'way', id: 844799022, center: { lat: 52.748984, lon: -1.3567851 }, tags: { name: "Reg's Crack", natural: 'bare_rock', source: 'Bing;survey', 'source:name': 'Leicestershireclimbs.f9.co.uk website' } },
    { type: 'way', id: 844799023, center: { lat: 52.7482694, lon: -1.3581041 }, tags: { name: "Grimley's Rock", natural: 'cliff', 'source:name': 'OS-OpenData_StreetView' } },
    { type: 'way', id: 999999999, center: { lat: 58.5, lon: -6.5 }, tags: { name: 'Sgeir Liath', natural: 'bare_rock' } }, // unrelated skerry ~600km away, must NOT appear
  ];
  const result = filterToSeedClusters(elements);
  assert.equal(result.length, 8);
  assert.deepEqual(
    result.map((e) => e.tags.name).sort(),
    ["Calvary Rock", "Grimley's Rock", 'High Cademan', "Hob's Hole", 'Pinacle Crag', "Reg's Crack", 'Turry Tor', 'Twenty Steps']
  );
});
