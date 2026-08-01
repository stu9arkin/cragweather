import { test } from 'node:test';
import assert from 'node:assert/strict';
import { getTimeSteps } from './time.js';

test('produces exactly 56 steps', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  assert.equal(steps.length, 56);
});

test('rounds the first step down to the nearest 3-hour UTC boundary', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  assert.equal(steps[0].date.toISOString(), '2026-08-01T09:00:00.000Z');
});

test('each step is exactly 3 hours after the previous one', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  for (let i = 1; i < steps.length; i++) {
    const diffMs = steps[i].date.getTime() - steps[i - 1].date.getTime();
    assert.equal(diffMs, 3 * 60 * 60 * 1000);
  }
});

test('isoHour matches Open-Meteo hourly time format', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  assert.equal(steps[0].isoHour, '2026-08-01T09:00');
  assert.equal(steps[1].isoHour, '2026-08-01T12:00');
});

test('label is a short human-readable day/time string', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  assert.equal(steps[0].label, 'Sat 09:00');
});

test('index matches array position', () => {
  const steps = getTimeSteps(new Date('2026-08-01T10:15:00Z'));
  assert.equal(steps[0].index, 0);
  assert.equal(steps[55].index, 55);
});
