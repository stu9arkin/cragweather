// scripts/fetch-crags.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync, rmSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { generateCragsData } from './fetch-crags.mjs';

const fixturePath = fileURLToPath(
  new URL('./lib/__fixtures__/sample-overpass-response.json', import.meta.url)
);
const fixtureBody = readFileSync(fixturePath, 'utf8');

function fakeFetchReturning(body, status = 200) {
  return async () => new Response(body, { status });
}

test('generateCragsData writes deduped, linked crags to outputPath', async () => {
  const outputPath = join(tmpdir(), `crags-test-${Date.now()}.json`);
  try {
    const crags = await generateCragsData({
      fetchImpl: fakeFetchReturning(fixtureBody),
      outputPath,
    });

    // fixture has: Stanage Edge (node+way, deduped to 1), indoor (dropped),
    // unnamed (dropped), Dumbarton Rock -> 2 crags expected
    assert.equal(crags.length, 2);
    assert.deepEqual(
      crags.map((c) => c.name),
      ['Dumbarton Rock', 'Stanage Edge'] // sorted alphabetically
    );
    for (const crag of crags) {
      assert.ok(crag.ukcSearchUrl.startsWith('https://www.google.com/search?q='));
    }

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, crags);
  } finally {
    rmSync(outputPath, { force: true });
  }
});

test('generateCragsData throws instead of writing an empty file', async () => {
  const outputPath = join(tmpdir(), `crags-test-empty-${Date.now()}.json`);
  try {
    await assert.rejects(
      () =>
        generateCragsData({
          fetchImpl: fakeFetchReturning(JSON.stringify({ elements: [] })),
          outputPath,
        }),
      /no crags/i
    );
  } finally {
    rmSync(outputPath, { force: true });
  }
});
