// js/weatherFetch.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchWeatherForLocations } from './weatherFetch.js';
import { getTimeSteps } from './logic/time.js';

const timeSteps = getTimeSteps(new Date('2026-08-01T09:00:00Z'));

function sampleApiResponse(count) {
  return Array.from({ length: count }, () => ({
    hourly: { time: ['2026-08-01T09:00'], temperature_2m: [10], precipitation: [0] },
    daily: { time: ['2026-08-01'], temperature_2m_max: [15], temperature_2m_min: [8], precipitation_sum: [0], weathercode: [1] },
  }));
}

test('fetches, batches, and parses locations, preserving input order', async () => {
  const locations = [
    { lat: 53.34, lon: -1.62 },
    { lat: 51.5, lon: -0.12 },
  ];
  const fakeFetch = async () => new Response(JSON.stringify(sampleApiResponse(2)), { status: 200 });
  const results = await fetchWeatherForLocations(locations, timeSteps, { fetchImpl: fakeFetch });
  assert.equal(results.length, 2);
  assert.equal(results[0].hourly.temperature[0], 10);
  assert.equal(results[0].daily[0].tempMax, 15);
});

test('splits locations across multiple batches by batchSize', async () => {
  const locations = Array.from({ length: 5 }, (_, i) => ({ lat: i, lon: i }));
  let callCount = 0;
  const fakeFetch = async (url) => {
    callCount++;
    const parsed = new URL(url);
    const n = parsed.searchParams.get('latitude').split(',').length;
    return new Response(JSON.stringify(sampleApiResponse(n)), { status: 200 });
  };
  const results = await fetchWeatherForLocations(locations, timeSteps, { fetchImpl: fakeFetch, batchSize: 2 });
  assert.equal(callCount, 3); // batches of 2, 2, 1
  assert.equal(results.length, 5);
});

test('retries on a 503 and succeeds on a later attempt', async () => {
  let attempt = 0;
  const fakeFetch = async () => {
    attempt++;
    if (attempt < 2) return new Response('busy', { status: 503 });
    return new Response(JSON.stringify(sampleApiResponse(1)), { status: 200 });
  };
  const results = await fetchWeatherForLocations([{ lat: 1, lon: 1 }], timeSteps, {
    fetchImpl: fakeFetch,
    retryBackoffMs: 1,
  });
  assert.equal(attempt, 2);
  assert.equal(results.length, 1);
});

test('throws after exhausting retries on repeated 503s', async () => {
  const fakeFetch = async () => new Response('busy', { status: 503 });
  await assert.rejects(
    () => fetchWeatherForLocations([{ lat: 1, lon: 1 }], timeSteps, { fetchImpl: fakeFetch, retryBackoffMs: 1 }),
    /503/
  );
});

test('does not retry a non-retryable 4xx', async () => {
  let attempt = 0;
  const fakeFetch = async () => {
    attempt++;
    return new Response('bad request', { status: 400 });
  };
  await assert.rejects(
    () => fetchWeatherForLocations([{ lat: 1, lon: 1 }], timeSteps, { fetchImpl: fakeFetch, retryBackoffMs: 1 }),
    /400/
  );
  assert.equal(attempt, 1);
});

test('does not retry a malformed (non-array) 200 response', async () => {
  let attempt = 0;
  const fakeFetch = async () => {
    attempt++;
    return new Response(JSON.stringify({ oops: true }), { status: 200 });
  };
  await assert.rejects(
    () => fetchWeatherForLocations([{ lat: 1, lon: 1 }], timeSteps, { fetchImpl: fakeFetch, retryBackoffMs: 1 }),
    /array/i
  );
  assert.equal(attempt, 1);
});
