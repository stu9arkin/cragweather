import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildNarrowOverpassQuery, buildBroadenedOverpassQuery, fetchOverpassElements, UK_BBOX } from './overpass.mjs';

test('UK_BBOX matches the spec bounding box', () => {
  assert.deepEqual(UK_BBOX, { south: 49.8, west: -8.6, north: 60.9, east: 1.8 });
});

test('buildNarrowOverpassQuery includes the bbox and climbing filters', () => {
  const query = buildNarrowOverpassQuery();
  assert.ok(query.includes('49.8,-8.6,60.9,1.8'));
  assert.ok(query.includes('"sport"="climbing"'));
  assert.ok(query.includes('"natural"="cliff"'));
  assert.ok(query.includes('"climbing"'));
  assert.ok(query.includes('out center tags;'));
  assert.ok(!query.includes('"natural"="bare_rock"'));
});

test('buildBroadenedOverpassQuery includes the named bare_rock and named-cliff clauses', () => {
  const query = buildBroadenedOverpassQuery();
  assert.ok(query.includes('49.8,-8.6,60.9,1.8'));
  assert.ok(query.includes('node["natural"="bare_rock"]["name"]'));
  assert.ok(query.includes('way["natural"="bare_rock"]["name"]'));
  assert.ok(query.includes('node["natural"="cliff"]["name"]'));
  assert.ok(query.includes('way["natural"="cliff"]["name"]'));
  assert.ok(query.includes('[timeout:110]'));
  assert.ok(!query.includes('"sport"="climbing"'));
});

function fakeFetchReturningTwoSets(narrowElements, broadenedElements) {
  return async (url, options) => {
    const isNarrowQuery = decodeURIComponent(options.body).includes('"sport"="climbing"');
    const elements = isNarrowQuery ? narrowElements : broadenedElements;
    return new Response(JSON.stringify({ elements }), { status: 200 });
  };
}

test('fetchOverpassElements fetches both queries and merges their elements', async () => {
  const fakeFetch = fakeFetchReturningTwoSets(
    [{ type: 'node', id: 1, tags: {} }],
    [{ type: 'node', id: 2, tags: {} }, { type: 'node', id: 3, tags: {} }]
  );

  const elements = await fetchOverpassElements(fakeFetch);

  assert.equal(elements.length, 3);
  assert.deepEqual(elements.map((e) => e.id).sort(), [1, 2, 3]);
});

test('fetchOverpassElements posts each query with the expected request shape', async () => {
  const capturedRequests = [];
  const fakeFetch = async (url, options) => {
    capturedRequests.push({ url, options });
    return new Response(JSON.stringify({ elements: [] }), { status: 200 });
  };

  await fetchOverpassElements(fakeFetch);

  assert.equal(capturedRequests.length, 2);
  for (const { url, options } of capturedRequests) {
    assert.equal(url, 'https://overpass-api.de/api/interpreter');
    assert.equal(options.method, 'POST');
    assert.ok(options.body.startsWith('data='));
    assert.ok(options.headers['User-Agent']);
  }
});

test('fetchOverpassElements retries a single query on a retryable non-OK response and throws after exhausting retries', async () => {
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

test('fetchOverpassElements retries transient 503 failures on the first query and succeeds on the 3rd attempt, then fetches the second query', async () => {
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

  // 3 attempts to succeed on the narrow query, then 1 successful attempt on
  // the broadened query = 4 total fetchImpl calls. Every successful
  // response in this fake returns the same single element, so both queries
  // contribute it - 2 elements total.
  assert.equal(callCount, 4);
  assert.equal(elements.length, 2);
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

  // 2 attempts to succeed on the narrow query, then 1 successful attempt on
  // the broadened query = 3 total fetchImpl calls, each contributing the
  // same single element = 2 elements total.
  assert.equal(callCount, 3);
  assert.equal(elements.length, 2);
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

test('fetchOverpassElements retries when the response has a remark field (Overpass soft timeout) and succeeds on a later attempt', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    if (callCount < 3) {
      return new Response(
        JSON.stringify({ elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 91 seconds.' }),
        { status: 200 }
      );
    }
    return new Response(JSON.stringify({ elements: [{ type: 'node', id: 1, tags: {} }] }), { status: 200 });
  };

  const elements = await fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 });

  // Same 3+1 = 4 call pattern as the 503 retry test above.
  assert.equal(callCount, 4);
  assert.equal(elements.length, 2);
});

test('fetchOverpassElements throws after exhausting retries when every attempt returns a remark', async () => {
  let callCount = 0;
  const fakeFetch = async () => {
    callCount++;
    return new Response(
      JSON.stringify({ elements: [], remark: 'runtime error: Query timed out in "query" at line 1 after 91 seconds.' }),
      { status: 200 }
    );
  };

  await assert.rejects(
    () => fetchOverpassElements(fakeFetch, undefined, { retryBackoffMs: 1 }),
    /timed out/
  );
  assert.equal(callCount, 3);
});
