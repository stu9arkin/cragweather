import { test } from 'node:test';
import assert from 'node:assert/strict';
import { chunk, buildOpenMeteoUrl } from './batching.js';

test('chunk splits an array into groups of the given size', () => {
  assert.deepEqual(chunk([1, 2, 3, 4, 5], 2), [[1, 2], [3, 4], [5]]);
});

test('chunk returns an empty array for an empty input', () => {
  assert.deepEqual(chunk([], 3), []);
});

test('chunk returns a single group when size >= length', () => {
  assert.deepEqual(chunk([1, 2], 10), [[1, 2]]);
});

test('buildOpenMeteoUrl includes comma-separated lat/lon lists in input order', () => {
  const url = buildOpenMeteoUrl([
    { lat: 53.34, lon: -1.62 },
    { lat: 51.5, lon: -0.12 },
  ]);
  const parsed = new URL(url);
  assert.equal(parsed.origin + parsed.pathname, 'https://api.open-meteo.com/v1/forecast');
  assert.equal(parsed.searchParams.get('latitude'), '53.34,51.5');
  assert.equal(parsed.searchParams.get('longitude'), '-1.62,-0.12');
});

test('buildOpenMeteoUrl requests both hourly and daily variables', () => {
  const url = buildOpenMeteoUrl([{ lat: 53.34, lon: -1.62 }]);
  const parsed = new URL(url);
  assert.equal(parsed.searchParams.get('hourly'), 'temperature_2m,precipitation');
  assert.equal(
    parsed.searchParams.get('daily'),
    'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode'
  );
  assert.equal(parsed.searchParams.get('timezone'), 'UTC');
});

test('buildOpenMeteoUrl defaults forecast_days to 8, or uses the given override', () => {
  const defaultUrl = new URL(buildOpenMeteoUrl([{ lat: 53.34, lon: -1.62 }]));
  assert.equal(defaultUrl.searchParams.get('forecast_days'), '8');

  const overriddenUrl = new URL(
    buildOpenMeteoUrl([{ lat: 53.34, lon: -1.62 }], { forecastDays: 2 })
  );
  assert.equal(overriddenUrl.searchParams.get('forecast_days'), '2');
});
