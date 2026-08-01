// js/logic/clusterAggregate.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { average } from './clusterAggregate.js';

test('averages a plain array of numbers', () => {
  assert.equal(average([2, 4, 6]), 4);
});

test('ignores null and undefined values', () => {
  assert.equal(average([2, null, 4, undefined, 6]), 4);
});

test('returns null when there are no numeric values', () => {
  assert.equal(average([]), null);
  assert.equal(average([null, undefined]), null);
});

test('handles a single value', () => {
  assert.equal(average([7]), 7);
});
