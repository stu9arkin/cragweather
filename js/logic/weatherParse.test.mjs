// js/logic/weatherParse.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { parseLocationForecast } from './weatherParse.js';
import { getTimeSteps } from './time.js';

const timeSteps = getTimeSteps(new Date('2026-08-01T09:00:00Z')); // starts exactly on a 3-hour boundary

test('aligns hourly temperature/rainfall to each time step by matching isoHour', () => {
  const apiResult = {
    hourly: {
      time: ['2026-08-01T09:00', '2026-08-01T10:00', '2026-08-01T11:00', '2026-08-01T12:00'],
      temperature_2m: [10, 11, 12, 13],
      precipitation: [0, 0.1, 0.2, 0.3],
    },
    daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], weathercode: [] },
  };
  const forecast = parseLocationForecast(apiResult, timeSteps);
  assert.equal(forecast.hourly.temperature.length, timeSteps.length);
  assert.equal(forecast.hourly.temperature[0], 10); // matches "09:00"
  assert.equal(forecast.hourly.temperature[1], 13); // matches "12:00" (step 1 is 3 hours after step 0)
  assert.equal(forecast.hourly.rainfall[0], 0);
  assert.equal(forecast.hourly.rainfall[1], 0.3);
});

test('a time step with no matching hourly timestamp gets null', () => {
  const apiResult = {
    hourly: { time: ['2026-08-01T09:00'], temperature_2m: [10], precipitation: [0] },
    daily: { time: [], temperature_2m_max: [], temperature_2m_min: [], precipitation_sum: [], weathercode: [] },
  };
  const forecast = parseLocationForecast(apiResult, timeSteps);
  assert.equal(forecast.hourly.temperature[0], 10);
  assert.equal(forecast.hourly.temperature[1], null);
  assert.equal(forecast.hourly.rainfall[1], null);
});

test('reshapes the daily block into one object per day', () => {
  const apiResult = {
    hourly: { time: [], temperature_2m: [], precipitation: [] },
    daily: {
      time: ['2026-08-01', '2026-08-02'],
      temperature_2m_max: [16.4, 21],
      temperature_2m_min: [7.9, 6.7],
      precipitation_sum: [0, 2.5],
      weathercode: [3, 61],
    },
  };
  const forecast = parseLocationForecast(apiResult, timeSteps);
  assert.deepEqual(forecast.daily, [
    { date: '2026-08-01', tempMax: 16.4, tempMin: 7.9, precipSum: 0, weathercode: 3 },
    { date: '2026-08-02', tempMax: 21, tempMin: 6.7, precipSum: 2.5, weathercode: 61 },
  ]);
});

test('handles a missing daily block gracefully (empty array, not a throw)', () => {
  const apiResult = { hourly: { time: [], temperature_2m: [], precipitation: [] } };
  const forecast = parseLocationForecast(apiResult, timeSteps);
  assert.deepEqual(forecast.daily, []);
});
