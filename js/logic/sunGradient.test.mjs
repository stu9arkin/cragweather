import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildSunGradientStops, stopsToCssGradient } from './sunGradient.js';

function iso(s) {
  return new Date(s);
}

test('returns night->day->night stops with blend windows around sunrise/sunset', () => {
  const timelineStart = iso('2026-08-10T00:00:00Z');
  const timelineEnd = iso('2026-08-11T00:00:00Z');
  const sunTimes = [{ sunrise: iso('2026-08-10T05:00:00Z'), sunset: iso('2026-08-10T19:00:00Z') }];

  const stops = buildSunGradientStops(sunTimes, timelineStart, timelineEnd);

  assert.equal(stops.length, 6);
  assert.equal(stops[0].offsetPercent, 0);
  assert.equal(stops[0].color, '#0d1b3e');
  assert.equal(stops[5].offsetPercent, 100);
  assert.equal(stops[5].color, '#0d1b3e');

  const spanMs = timelineEnd - timelineStart;
  const expectedPercent = (d) => ((d - timelineStart) / spanMs) * 100;

  assert.ok(Math.abs(stops[1].offsetPercent - expectedPercent(iso('2026-08-10T04:40:00Z'))) < 0.001);
  assert.equal(stops[1].color, '#0d1b3e');
  assert.ok(Math.abs(stops[2].offsetPercent - expectedPercent(iso('2026-08-10T05:20:00Z'))) < 0.001);
  assert.equal(stops[2].color, '#cfe8ff');
  assert.ok(Math.abs(stops[3].offsetPercent - expectedPercent(iso('2026-08-10T18:40:00Z'))) < 0.001);
  assert.equal(stops[3].color, '#cfe8ff');
  assert.ok(Math.abs(stops[4].offsetPercent - expectedPercent(iso('2026-08-10T19:20:00Z'))) < 0.001);
  assert.equal(stops[4].color, '#0d1b3e');
});

test('spans multiple days, producing 4 blend stops per additional day, sorted ascending', () => {
  const timelineStart = iso('2026-08-10T00:00:00Z');
  const timelineEnd = iso('2026-08-12T00:00:00Z');
  const sunTimes = [
    { sunrise: iso('2026-08-10T05:00:00Z'), sunset: iso('2026-08-10T19:00:00Z') },
    { sunrise: iso('2026-08-11T05:01:00Z'), sunset: iso('2026-08-11T18:59:00Z') },
  ];
  const stops = buildSunGradientStops(sunTimes, timelineStart, timelineEnd);

  assert.equal(stops.length, 10); // 2 boundary stops + 4 blend stops per day * 2 days
  for (let i = 1; i < stops.length; i++) {
    assert.ok(stops[i].offsetPercent >= stops[i - 1].offsetPercent);
  }
});

test('returns an empty array when no sun data is available', () => {
  const timelineStart = iso('2026-08-10T00:00:00Z');
  const timelineEnd = iso('2026-08-11T00:00:00Z');
  assert.deepEqual(buildSunGradientStops([], timelineStart, timelineEnd), []);
  assert.deepEqual(buildSunGradientStops(null, timelineStart, timelineEnd), []);
});

test('stopsToCssGradient renders a linear-gradient string, or null when there are no stops', () => {
  const css = stopsToCssGradient([
    { offsetPercent: 0, color: '#0d1b3e' },
    { offsetPercent: 100, color: '#cfe8ff' },
  ]);
  assert.equal(css, 'linear-gradient(to right, #0d1b3e 0.00%, #cfe8ff 100.00%)');
  assert.equal(stopsToCssGradient([]), null);
});
