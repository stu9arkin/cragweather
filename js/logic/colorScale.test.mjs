// js/logic/colorScale.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { temperatureColor, rainfallColor, getNeutralColor, getLegendStops } from './colorScale.js';

test('getNeutralColor returns a fixed grey', () => {
  assert.equal(getNeutralColor(), '#9e9e9e');
});

test('temperatureColor returns the neutral colour for null/undefined/NaN', () => {
  assert.equal(temperatureColor(null), getNeutralColor());
  assert.equal(temperatureColor(undefined), getNeutralColor());
  assert.equal(temperatureColor(NaN), getNeutralColor());
});

test('temperatureColor clamps to the coldest/warmest stop colours outside the range', () => {
  assert.equal(temperatureColor(-100), temperatureColor(-5));
  assert.equal(temperatureColor(100), temperatureColor(30));
});

test('temperatureColor returns a valid rgb() string for a mid-range value', () => {
  const color = temperatureColor(12);
  assert.match(color, /^rgb\(\d+, \d+, \d+\)$/);
});

test('rainfallColor returns the neutral colour for null', () => {
  assert.equal(rainfallColor(null), getNeutralColor());
});

test('rainfallColor increases toward the wettest stop as mm increases', () => {
  const low = temperatureColorToRgbSum(rainfallColor(0));
  const high = temperatureColorToRgbSum(rainfallColor(10));
  // Wetter should be darker/bluer overall (lower combined channel sum is a
  // reasonable proxy given the chosen light-to-dark-blue palette)
  assert.ok(high < low, `expected wetter color sum (${high}) < drier color sum (${low})`);
});

test('getLegendStops returns stops with units in the label, for both variables', () => {
  const tempStops = getLegendStops('temperature');
  const rainStops = getLegendStops('rainfall');
  assert.ok(tempStops.length >= 2);
  assert.ok(rainStops.length >= 2);
  assert.match(tempStops[0].label, /°C/);
  assert.match(rainStops[0].label, /mm/);
});

function temperatureColorToRgbSum(rgbString) {
  const match = rgbString.match(/^rgb\((\d+), (\d+), (\d+)\)$/);
  if (!match) return null;
  return Number(match[1]) + Number(match[2]) + Number(match[3]);
}
