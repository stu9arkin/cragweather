import { test } from 'node:test';
import assert from 'node:assert/strict';
import { writeFileSync, rmSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { applyOverrides, loadOverrides } from './overrides.mjs';

test('applyOverrides removes crags whose id is in exclude', () => {
  const crags = [
    { id: 'node/1', name: 'Keep Me', lat: 53.0, lon: -1.0 },
    { id: 'node/2', name: 'Drop Me', lat: 53.1, lon: -1.1 },
  ];
  const result = applyOverrides(crags, { exclude: ['node/2'], include: [] });
  assert.deepEqual(result.map((c) => c.id), ['node/1']);
});

test('applyOverrides appends include entries verbatim', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', name: 'Added Crag', lat: 53.1, lon: -1.1 };
  const result = applyOverrides(crags, { exclude: [], include: [included] });
  assert.deepEqual(result, [crags[0], included]);
});

test('applyOverrides handles missing exclude/include keys as empty', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const result = applyOverrides(crags, {});
  assert.deepEqual(result, crags);
});

test('loadOverrides reads and parses a JSON overrides file', () => {
  const path = join(tmpdir(), `crag-overrides-test-${Date.now()}.json`);
  try {
    writeFileSync(path, JSON.stringify({ exclude: ['node/1'], include: [] }));
    const overrides = loadOverrides(path);
    assert.deepEqual(overrides, { exclude: ['node/1'], include: [] });
  } finally {
    rmSync(path, { force: true });
  }
});

test('the committed scripts/crag-overrides.json loads and starts empty', () => {
  const overrides = loadOverrides();
  assert.deepEqual(overrides, { exclude: [], include: [] });
});
