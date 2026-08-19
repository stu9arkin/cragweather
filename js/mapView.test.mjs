// js/mapView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusCrag, buildCragIcon, createClusterIcon, resolveCragValue, updateMarkerColors, createEmitter } from './mapView.js';

test('focusCrag centers the map on the crag at zoom 14 and fires crag:selected', () => {
  const setViewCalls = [];
  const fireCalls = [];
  const fakeMap = {
    setView(latlng, zoom) {
      setViewCalls.push({ latlng, zoom });
    },
    fire(event, payload) {
      fireCalls.push({ event, payload });
    },
  };
  const view = { map: fakeMap };
  const crag = { id: 'node/1', name: 'Stanage Edge', lat: 53.34, lon: -1.62 };

  focusCrag(view, crag);

  assert.deepEqual(setViewCalls, [{ latlng: [53.34, -1.62], zoom: 14 }]);
  assert.deepEqual(fireCalls, [{ event: 'crag:selected', payload: { crag } }]);
});

test('buildCragIcon shows the formatted value on a colored background', () => {
  const colorFn = (v) => `rgb(${v}, 0, 0)`;
  const html = buildCragIcon(14, 'temperature', colorFn);
  assert.match(html, /14°C/);
  assert.match(html, /rgb\(14, 0, 0\)/);
  assert.match(html, /class="crag-marker-icon"/);
});

test('buildCragIcon falls back to neutral color and en dash for null value', () => {
  const html = buildCragIcon(null, 'rainfall', () => {
    throw new Error('colorFn should not be called for a null value');
  });
  assert.match(html, /–/);
  assert.match(html, /#9e9e9e/);
});

test('createClusterIcon shows the formatted average value instead of the child count', () => {
  const colorFn = (v) => `rgb(${v}, 0, 0)`;
  const html = createClusterIcon([10, 20], 'temperature', colorFn);
  assert.match(html, /15°C/);
  assert.doesNotMatch(html, />2</);
});

test('createClusterIcon falls back to neutral color and en dash when every value is null', () => {
  const html = createClusterIcon([null, null], 'rainfall', () => 'rgb(255, 0, 0)');
  assert.match(html, /–/);
  assert.match(html, /#9e9e9e/);
});

test('resolveCragValue picks the value at the given time index for the given variable', () => {
  const forecast = { hourly: { temperature: [10, 20], rainfall: [1, 2] } };
  assert.equal(resolveCragValue(forecast, 'temperature', 1), 20);
  assert.equal(resolveCragValue(forecast, 'rainfall', 0), 1);
});

test('resolveCragValue returns null when there is no forecast for the crag', () => {
  assert.equal(resolveCragValue(undefined, 'temperature', 0), null);
});

test('createEmitter delivers emitted payloads to every registered listener for that event name', () => {
  const emitter = createEmitter();
  const received = [];
  emitter.on('crag:selected', (payload) => received.push(['a', payload]));
  emitter.on('crag:selected', (payload) => received.push(['b', payload]));
  emitter.on('other:event', () => received.push(['c', null]));

  emitter.emit('crag:selected', { crag: { id: 'crag-1' } });

  assert.deepEqual(received, [
    ['a', { crag: { id: 'crag-1' } }],
    ['b', { crag: { id: 'crag-1' } }],
  ]);
});
