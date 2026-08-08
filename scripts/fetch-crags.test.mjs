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

    // fakeFetchReturning serves the same fixture body to both the narrow and
    // broadened Overpass queries generateCragsData issues, so every fixture
    // element is fetched (and merged) twice - dedupeCrags is what collapses
    // those duplicates back down to one entry per real-world crag.
    //
    // fixture has: Stanage Edge (node+way, deduped to 1), indoor (dropped),
    // unnamed (dropped), Dumbarton Rock, Parisella's Caves (amenity=shelter,
    // a real rock shelter, not dropped), Stanage Plantation Boulders (no
    // climbing tag at all, but within 400m of the Stanage Edge seed so it's
    // recovered by filterToSeedClusters), Cape Wrath Rocks (also no climbing
    // tag, but far from every seed so filterToSeedClusters drops it)
    // -> 4 crags expected
    assert.equal(crags.length, 4);
    assert.deepEqual(
      crags.map((c) => c.name),
      [
        'Dumbarton Rock',
        "Parisella's Caves",
        'Stanage Edge',
        'Stanage Plantation Boulders',
      ] // sorted alphabetically
    );
    for (const crag of crags) {
      assert.ok(crag.ukcSearchUrl.startsWith('https://www.ukclimbing.com/logbook/search/?sort=score&query='));
    }

    const written = JSON.parse(readFileSync(outputPath, 'utf8'));
    assert.deepEqual(written, crags);
  } finally {
    rmSync(outputPath, { force: true });
  }
});

test('generateCragsData applies exclude/include overrides', async () => {
  const outputPath = join(tmpdir(), `crags-test-overrides-${Date.now()}.json`);
  try {
    const crags = await generateCragsData({
      fetchImpl: fakeFetchReturning(fixtureBody),
      outputPath,
      overrides: {
        exclude: ['node/1004'], // Dumbarton Rock
        include: [{ id: 'node/9999', name: 'Manually Added Crag', lat: 51.0, lon: -1.0 }],
      },
    });

    assert.deepEqual(
      crags.map((c) => c.name),
      [
        'Manually Added Crag',
        "Parisella's Caves",
        'Stanage Edge',
        'Stanage Plantation Boulders',
      ]
    );
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
