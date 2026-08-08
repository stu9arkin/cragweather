import { test } from 'node:test';
import assert from 'node:assert/strict';
import { fetchSunTimes, buildSunTimesUrl } from './sunFetch.js';

function sampleResponse(days) {
  const sunrise = [];
  const sunset = [];
  for (let i = 0; i < days; i++) {
    const d = String(i + 10).padStart(2, '0');
    sunrise.push(`2026-08-${d}T05:00`);
    sunset.push(`2026-08-${d}T19:00`);
  }
  return { daily: { sunrise, sunset } };
}

test('buildSunTimesUrl includes the point, day count, and UTC timezone', () => {
  const url = new URL(buildSunTimesUrl({ lat: 55.35, lon: -3.4 }, 7));
  assert.equal(url.searchParams.get('latitude'), '55.35');
  assert.equal(url.searchParams.get('longitude'), '-3.4');
  assert.equal(url.searchParams.get('daily'), 'sunrise,sunset');
  assert.equal(url.searchParams.get('forecast_days'), '7');
  assert.equal(url.searchParams.get('timezone'), 'UTC');
});

test('parses sunrise/sunset pairs into Date objects, one per day', async () => {
  const fakeFetch = async () => new Response(JSON.stringify(sampleResponse(2)), { status: 200 });
  const result = await fetchSunTimes({ lat: 55.35, lon: -3.4 }, 2, { fetchImpl: fakeFetch });
  assert.equal(result.length, 2);
  assert.ok(result[0].sunrise instanceof Date);
  assert.equal(result[0].sunrise.toISOString(), '2026-08-10T05:00:00.000Z');
  assert.equal(result[0].sunset.toISOString(), '2026-08-10T19:00:00.000Z');
});

test('resolves with an empty array (does not throw) on a server error, with no retry', async () => {
  let attempts = 0;
  const fakeFetch = async () => {
    attempts++;
    return new Response('busy', { status: 503 });
  };
  const result = await fetchSunTimes({ lat: 55.35, lon: -3.4 }, 7, { fetchImpl: fakeFetch });
  assert.deepEqual(result, []);
  assert.equal(attempts, 1);
});

test('resolves with an empty array on a malformed response', async () => {
  const fakeFetch = async () => new Response(JSON.stringify({ daily: {} }), { status: 200 });
  const result = await fetchSunTimes({ lat: 55.35, lon: -3.4 }, 7, { fetchImpl: fakeFetch });
  assert.deepEqual(result, []);
});
