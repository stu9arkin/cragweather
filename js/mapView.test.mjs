// js/mapView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { focusCrag } from './mapView.js';

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
