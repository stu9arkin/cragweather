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
  assert.ok(capturedOptions.headers['User-Agent']);
  assert.equal(elements.length, 1);
});

test('fetchOverpassElements retries on a retryable non-OK response and throws after exhausting retries', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    return new Response('busy', { status: 504 });
  };
  await assert.rejects(
    () => fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 }),
    /504/
  );
  assert.equal(callCount, 3);
});

test('fetchOverpassElements retries transient 503 failures and succeeds on the 3rd attempt', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    if (callCount < 3) {
      return new Response('busy', { status: 503 });
    }
    return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, tags: {} }] }), {
      status: 200,
    });
  };

  const elements = await fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 });

  assert.equal(callCount, 3);
  assert.equal(elements.length, 1);
});

test('fetchOverpassElements throws after exhausting retries when every attempt fails with 503', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    return new Response('busy', { status: 503 });
  };

  await assert.rejects(
    () => fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 }),
    /503/
  );
  assert.equal(callCount, 3);
});

test('fetchOverpassElements does not retry a non-retryable 4xx response', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    return new Response('bad request', { status: 400 });
  };

  await assert.rejects(
    () => fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 }),
    /400/
  );
  assert.equal(callCount, 1);
});

test('fetchOverpassElements retries on a thrown network error', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    if (callCount < 2) {
      throw new Error('network down');
    }
    return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, tags: {} }] }), {
      status: 200,
    });
  };

  const elements = await fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 });

  assert.equal(callCount, 2);
  assert.equal(elements.length, 1);
});

test('fetchOverpassElements throws when elements array is missing, without retrying', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    return new Response(JSON.stringify({ oops: true }), { status: 200 });
  };
  await assert.rejects(() => fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 }), /elements/);
  assert.equal(callCount, 1);
});
