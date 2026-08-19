// js/mapView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import {
  focusCrag,
  buildCragEntry,
  buildCragIcon,
  createClusterIcon,
  resolveCragValue,
  updateMarkerColors,
  createEmitter,
  setMapTheme,
} from './mapView.js';

function makeElement() {
  return {
    title: '',
    tabIndex: null,
    attributes: {},
    _handlers: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    addEventListener(name, handler) {
      (this._handlers[name] = this._handlers[name] || []).push(handler);
    },
    fire(name, eventObj = {}) {
      (this._handlers[name] || []).forEach((handler) => handler(eventObj));
    },
  };
}

function installMarkerDom() {
  globalThis.document = {
    createElement: (tag) =>
      tag === 'template' ? { innerHTML: '', content: { firstElementChild: makeElement() } } : makeElement(),
  };
  globalThis.mapboxgl = {
    Marker: class {
      constructor(opts) {
        this.opts = opts;
      }
      setLngLat() {
        return this;
      }
      addTo() {
        return this;
      }
      remove() {}
    },
  };
}

function uninstallMarkerDom() {
  delete globalThis.document;
  delete globalThis.mapboxgl;
}

test('focusCrag flies the map to the crag at the focus zoom and emits crag:selected', () => {
  const flyToCalls = [];
  const emitCalls = [];
  const view = {
    map: { flyTo: (opts) => flyToCalls.push(opts) },
    emit: (event, payload) => emitCalls.push({ event, payload }),
  };
  const crag = { id: 'node/1', name: 'Stanage Edge', lat: 53.34, lon: -1.62 };

  focusCrag(view, crag);

  assert.equal(flyToCalls.length, 1);
  assert.deepEqual(flyToCalls[0].center, [-1.62, 53.34]);
  assert.equal(flyToCalls[0].zoom, 14);
  assert.deepEqual(emitCalls, [{ event: 'crag:selected', payload: { crag } }]);
});

test('setMapTheme switches the map to the dark style for "dark" and the streets style for "light"', () => {
  const setStyleCalls = [];
  const view = { map: { setStyle: (style) => setStyleCalls.push(style) } };

  setMapTheme(view, 'dark');
  setMapTheme(view, 'light');

  assert.equal(setStyleCalls.length, 2);
  assert.equal(setStyleCalls[0], 'mapbox://styles/mapbox/dark-v11');
  assert.equal(setStyleCalls[1], 'mapbox://styles/mapbox/streets-v12');
});

test('clicking a crag marker zooms in and emits crag:selected, same as focusCrag', () => {
  installMarkerDom();
  try {
    const crag = { id: 'node/1', name: 'Stanage Edge', lat: 53.34, lon: -1.62 };
    const flyToCalls = [];
    const emitCalls = [];
    const view = {
      cragsById: new Map([[crag.id, crag]]),
      activeVariable: 'temperature',
      activeColorFn: () => '#000',
      map: { flyTo: (opts) => flyToCalls.push(opts) },
      emit: (event, payload) => emitCalls.push({ event, payload }),
    };
    const feature = { properties: { cragId: crag.id, cragValue: 20 } };

    const entry = buildCragEntry(view, feature);
    entry.el.fire('click');

    assert.equal(flyToCalls.length, 1);
    assert.deepEqual(flyToCalls[0].center, [-1.62, 53.34]);
    assert.equal(flyToCalls[0].zoom, 14);
    assert.deepEqual(emitCalls, [{ event: 'crag:selected', payload: { crag } }]);
  } finally {
    uninstallMarkerDom();
  }
});

test('pressing Enter or Space on a crag marker also zooms in', () => {
  installMarkerDom();
  try {
    const crag = { id: 'node/1', name: 'Stanage Edge', lat: 53.34, lon: -1.62 };
    const flyToCalls = [];
    const view = {
      cragsById: new Map([[crag.id, crag]]),
      activeVariable: 'temperature',
      activeColorFn: () => '#000',
      map: { flyTo: (opts) => flyToCalls.push(opts) },
      emit: () => {},
    };
    const feature = { properties: { cragId: crag.id, cragValue: 20 } };

    const entry = buildCragEntry(view, feature);
    entry.el.fire('keydown', { key: 'Enter', preventDefault: () => {} });
    entry.el.fire('keydown', { key: ' ', preventDefault: () => {} });

    assert.equal(flyToCalls.length, 2);
  } finally {
    uninstallMarkerDom();
  }
});

test('updateMarkerColors updates cragValue for every crag and rewrites active marker elements in place', () => {
  const cragEl = { style: {}, textContent: '' };
  const clusterEl = { style: {}, textContent: '' };
  const point1 = { properties: { cragId: 'crag-1', cragValue: null } };
  const point2 = { properties: { cragId: 'crag-2', cragValue: null } };
  const view = {
    activeColorFn: null,
    activeVariable: null,
    pointsByCragId: new Map([
      ['crag-1', point1],
      ['crag-2', point2],
    ]),
    activeMarkers: [
      { kind: 'crag', cragId: 'crag-1', el: cragEl },
      { kind: 'cluster', clusterId: 7, el: clusterEl },
    ],
    index: {
      getLeaves: (clusterId) => (clusterId === 7 ? [point1, point2] : []),
    },
  };
  const weatherByCragId = new Map([
    ['crag-1', { hourly: { temperature: [10, 20], rainfall: [1, 2] } }],
    ['crag-2', { hourly: { temperature: [30, 40], rainfall: [3, 4] } }],
  ]);

  updateMarkerColors(view, weatherByCragId, 'temperature', 1);

  assert.equal(point1.properties.cragValue, 20);
  assert.equal(point2.properties.cragValue, 40);
  assert.equal(view.activeVariable, 'temperature');
  assert.match(cragEl.textContent, /20°C/);
  assert.match(clusterEl.textContent, /30°C/); // average of 20 and 40
});

test('updateMarkerColors leaves activeMarkers untouched as an array (no add/remove)', () => {
  const cragEl = { style: {}, textContent: '' };
  const point1 = { properties: { cragId: 'crag-1', cragValue: null } };
  const markerEntry = { kind: 'crag', cragId: 'crag-1', el: cragEl };
  const view = {
    activeColorFn: null,
    activeVariable: null,
    pointsByCragId: new Map([['crag-1', point1]]),
    activeMarkers: [markerEntry],
    index: { getLeaves: () => [] },
  };
  const weatherByCragId = new Map([['crag-1', { hourly: { temperature: [5], rainfall: [0] } }]]);

  updateMarkerColors(view, weatherByCragId, 'temperature', 0);

  assert.equal(view.activeMarkers.length, 1);
  assert.equal(view.activeMarkers[0], markerEntry);
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
