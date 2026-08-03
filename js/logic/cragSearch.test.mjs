import { test } from 'node:test';
import assert from 'node:assert/strict';
import { searchCrags } from './cragSearch.js';

function crag(id, name) {
  return { id, name, lat: 0, lon: 0 };
}

test('searchCrags returns an empty array for an empty or whitespace-only query', () => {
  const crags = [crag('1', 'Stanage Edge')];
  assert.deepEqual(searchCrags(crags, ''), []);
  assert.deepEqual(searchCrags(crags, '   '), []);
});

test('searchCrags returns an empty array when nothing matches', () => {
  const crags = [crag('1', 'Stanage Edge'), crag('2', 'Portland')];
  assert.deepEqual(searchCrags(crags, 'zzzzzqqqq'), []);
});

test('searchCrags ranks prefix > mid-string > fuzzy typo matches', () => {
  const crags = [
    crag('a', 'Edgehill'), // 'edge' matches at index 0
    crag('b', 'Stanage Edge'), // 'edge' matches at index 8
    crag('c', 'Eadge'), // typo, 1 insertion away from 'edge', no substring match
  ];
  const results = searchCrags(crags, 'edge');
  assert.deepEqual(
    results.map((c) => c.name),
    ['Edgehill', 'Stanage Edge', 'Eadge']
  );
});

test('searchCrags fuzzy-matches a typo when there is no substring match', () => {
  const crags = [crag('1', 'Portland'), crag('2', 'Black Rocks')];
  const results = searchCrags(crags, 'protland');
  assert.deepEqual(results.map((c) => c.name), ['Portland']);
});

test('searchCrags caps results at the default limit of 8', () => {
  const crags = Array.from({ length: 10 }, (_, i) => crag(String(i), `Test Crag ${i}`));
  assert.equal(searchCrags(crags, 'test').length, 8);
});

test('searchCrags honors a custom limit', () => {
  const crags = Array.from({ length: 10 }, (_, i) => crag(String(i), `Test Crag ${i}`));
  assert.equal(searchCrags(crags, 'test', 3).length, 3);
});
