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

test('applyOverrides throws a clear error when an include entry is missing id', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { name: 'Added Crag', lat: 53.1, lon: -1.1 };
  assert.throws(
    () => applyOverrides(crags, { include: [included] }),
    /crag-overrides\.json include\[0\] is missing required field 'id'/,
  );
});

test('applyOverrides throws a clear error when an include entry is missing name', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', lat: 53.1, lon: -1.1 };
  assert.throws(
    () => applyOverrides(crags, { include: [included] }),
    /crag-overrides\.json include\[0\] is missing required field 'name'/,
  );
});

test('applyOverrides throws a clear error when an include entry is missing lat', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', name: 'Added Crag', lon: -1.1 };
  assert.throws(
    () => applyOverrides(crags, { include: [included] }),
    /crag-overrides\.json include\[0\] is missing required field 'lat'/,
  );
});

test('applyOverrides throws a clear error when an include entry is missing lon', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', name: 'Added Crag', lat: 53.1 };
  assert.throws(
    () => applyOverrides(crags, { include: [included] }),
    /crag-overrides\.json include\[0\] is missing required field 'lon'/,
  );
});

test('applyOverrides throws a clear error when an include entry has non-numeric lat/lon', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', name: 'Added Crag', lat: 'fifty-three', lon: -1.1 };
  assert.throws(
    () => applyOverrides(crags, { include: [included] }),
    /crag-overrides\.json include\[0\] has non-numeric lat\/lon/,
  );
});

test('applyOverrides names the correct index for a later invalid include entry', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const valid = { id: 'node/2', name: 'Valid Crag', lat: 53.1, lon: -1.1 };
  const invalid = { id: 'node/3', name: 'Invalid Crag', lat: NaN, lon: -1.2 };
  assert.throws(
    () => applyOverrides(crags, { include: [valid, invalid] }),
    /crag-overrides\.json include\[1\] has non-numeric lat\/lon/,
  );
});

test('applyOverrides passes through a well-formed include entry unchanged', () => {
  const crags = [{ id: 'node/1', name: 'Existing', lat: 53.0, lon: -1.0 }];
  const included = { id: 'node/2', name: 'Added Crag', lat: 53.1, lon: -1.1 };
  const result = applyOverrides(crags, { exclude: [], include: [included] });
  assert.deepEqual(result, [crags[0], included]);
});
