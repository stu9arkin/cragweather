import { test } from 'node:test';
import assert from 'node:assert/strict';
import { loadCrags } from './cragData.js';

test('loadCrags fetches and returns the parsed crag array', async () => {
  const sample = [{ id: 'node/1', name: 'Stanage Edge', lat: 53.34, lon: -1.62, ukcSearchUrl: 'https://x' }];
  const fakeFetch = async (url) => {
    assert.equal(url, 'data/crags.json');
    return new Response(JSON.stringify(sample), { status: 200 });
  };
  const crags = await loadCrags(fakeFetch);
  assert.deepEqual(crags, sample);
});

test('loadCrags throws on a non-OK response', async () => {
  const fakeFetch = async () => new Response('not found', { status: 404 });
  await assert.rejects(() => loadCrags(fakeFetch), /404/);
});

test('loadCrags throws when the body is not an array', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ oops: true }), { status: 200 });
  await assert.rejects(() => loadCrags(fakeFetch), /array/i);
});

test('loadCrags accepts a custom url', async () => {
  const fakeFetch = async (url) => {
    assert.equal(url, '/custom/path.json');
    return new Response('[]', { status: 200 });
  };
  await loadCrags(fakeFetch, '/custom/path.json');
});
