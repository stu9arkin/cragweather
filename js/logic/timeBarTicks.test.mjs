import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildTimeBarTicks } from './timeBarTicks.js';
import { getTimeSteps } from './time.js';

test('marks every 3-hour step, with major ticks (and labels) every 6 hours', () => {
  const timeSteps = getTimeSteps(new Date('2026-08-10T00:00:00Z')); // 2026-08-10T00:00Z is a Monday
  const ticks = buildTimeBarTicks(timeSteps);

  assert.equal(ticks.length, 56);
  assert.equal(ticks.filter((t) => t.major).length, 28);

  assert.equal(ticks[0].major, true);
  assert.equal(ticks[0].label, 'Mon');
  assert.equal(ticks[1].major, false);
  assert.equal(ticks[1].label, null);
  assert.equal(ticks[2].major, true);
  assert.equal(ticks[2].label, '06:00');
});

test('offsetPercent runs from 0 to 100 across the full span', () => {
  const timeSteps = getTimeSteps(new Date('2026-08-10T00:00:00Z'));
  const ticks = buildTimeBarTicks(timeSteps);
  assert.equal(ticks[0].offsetPercent, 0);
  assert.equal(ticks[ticks.length - 1].offsetPercent, 100);
});
