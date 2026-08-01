import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildOverpassQuery, fetchOverpassElements, UK_BBOX } from './overpass.mjs';

test('UK_BBOX matches the spec bounding box', () => {
  assert.deepEqual(UK_BBOX, { south: 49.8, west: -8.6, north: 60.9, east: 1.8 });
});

test('buildOverpassQuery includes the bbox and climbing filters', () => {
  const query = buildOverpassQuery();
  assert.ok(query.includes('49.8,-8.6,60.9,1.8'));
  assert.ok(query.includes('"sport"="climbing"'));
  assert.ok(query.includes('"natural"="cliff"'));
  assert.ok(query.includes('out center tags;'));
});

test('fetchOverpassElements posts the query and returns elements', async () => {
  let capturedUrl, capturedOptions;
  const fakeFetch = async (url, options) => {
    capturedUrl = url;
    capturedOptions = options;
    return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, tags: {} }] }), {
      status: 200,
    });
  };

  const elements = await fetchOverpassElements(fakeFetch);

  assert.equal(capturedUrl, 'https://overpass-api.de/api/interpreter');
  assert.equal(capturedOptions.method, 'POST');
  assert.ok(capturedOptions.body.startsWith('data='));
  assert.equal(elements.length, 1);
});

test('fetchOverpassElements throws on a non-OK response', async () => {
  const fakeFetch = async () => new Response('busy', { status: 504 });
  await assert.rejects(() => fetchOverpassElements(fakeFetch), /504/);
});

test('fetchOverpassElements throws when elements array is missing', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ oops: true }), { status: 200 });
  await assert.rejects(() => fetchOverpassElements(fakeFetch), /elements/);
});
