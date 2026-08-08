// js/mapView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusCrag, buildCragIcon } from './mapView.js';

function installLeafletStub() {
  const divIconCalls = [];
  globalThis.L = {
    divIcon: (opts) => {
      divIconCalls.push(opts);
      return { __fakeIcon: true, opts };
    },
    point: (x, y) => ({ x, y }),
  };
  return { divIconCalls };
}

function uninstallLeafletStub() {
  delete globalThis.L;
}

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
  const { divIconCalls } = installLeafletStub();
  try {
    const colorFn = (v) => `rgb(${v}, 0, 0)`;
    const icon = buildCragIcon(14, 'temperature', colorFn);
    assert.ok(icon.__fakeIcon);
    assert.match(divIconCalls[0].html, /14°C/);
    assert.match(divIconCalls[0].html, /rgb\(14, 0, 0\)/);
    assert.equal(divIconCalls[0].className, 'crag-marker-icon-wrapper');
    assert.deepEqual(divIconCalls[0].iconSize, { x: 28, y: 28 });
  } finally {
    uninstallLeafletStub();
  }
});

test('buildCragIcon falls back to neutral color and en dash for null value', () => {
  const { divIconCalls } = installLeafletStub();
  try {
    const colorFn = () => {
      throw new Error('colorFn should not be called for a null value');
    };
    buildCragIcon(null, 'rainfall', colorFn);
    assert.match(divIconCalls[0].html, /–/);
    assert.match(divIconCalls[0].html, /#9e9e9e/);
  } finally {
    uninstallLeafletStub();
  }
});
