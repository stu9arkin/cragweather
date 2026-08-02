// js/heatmapView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { createHeatmapView, updateHeatmapColors, setHeatmapVisible, canvasDimensions } from './heatmapView.js';

function installStubs() {
  const putImageDataCalls = [];
  const setUrlCalls = [];
  const addToCalls = [];

  const fakeCtx = {
    putImageData(imageData, x, y) {
      putImageDataCalls.push({ imageData, x, y });
    },
  };

  const fakeCanvas = {
    width: 0,
    height: 0,
    getContext: () => fakeCtx,
    toDataURL: () => 'data:image/png;base64,FAKE',
  };

  globalThis.document = { createElement: () => fakeCanvas };

  globalThis.ImageData = class FakeImageData {
    constructor(data, width, height) {
      this.data = data;
      this.width = width;
      this.height = height;
    }
  };

  const fakeOverlay = {
    setUrl(url) {
      setUrlCalls.push(url);
    },
    addTo(map) {
      addToCalls.push(map);
    },
  };

  globalThis.L = { imageOverlay: () => fakeOverlay };

  return { fakeCanvas, fakeOverlay, putImageDataCalls, setUrlCalls, addToCalls };
}

function uninstallStubs() {
  delete globalThis.document;
  delete globalThis.ImageData;
  delete globalThis.L;
}

test('canvasDimensions caps the longer edge and preserves aspect ratio (wide bbox)', () => {
  const result = canvasDimensions({ south: 0, north: 10, west: 0, east: 20 }, 600);
  assert.deepEqual(result, { width: 600, height: 300 });
});

test('canvasDimensions caps the longer edge and preserves aspect ratio (tall bbox)', () => {
  const result = canvasDimensions({ south: 0, north: 20, west: 0, east: 10 }, 600);
  assert.deepEqual(result, { width: 300, height: 600 });
});

test('createHeatmapView sizes the canvas to the bbox aspect ratio and returns the overlay', () => {
  const { fakeCanvas, fakeOverlay } = installStubs();
  try {
    const bbox = { south: 0, north: 10, west: 0, east: 20 };
    const view = createHeatmapView([], bbox);
    assert.equal(fakeCanvas.width, 600);
    assert.equal(fakeCanvas.height, 300);
    assert.equal(view.canvas, fakeCanvas);
    assert.equal(view.overlay, fakeOverlay);
  } finally {
    uninstallStubs();
  }
});

test('updateHeatmapColors draws interpolated pixels to the canvas and pushes them to the overlay', () => {
  const { fakeCanvas, fakeOverlay, putImageDataCalls, setUrlCalls } = installStubs();
  try {
    const bbox = { south: 50, north: 51, west: -2, east: -1 };
    const gridPoints = [
      { lat: 50, lon: -2 },
      { lat: 50, lon: -1 },
      { lat: 51, lon: -2 },
      { lat: 51, lon: -1 },
    ];
    const view = createHeatmapView(gridPoints, bbox);
    const gridWeather = gridPoints.map(() => ({ hourly: { temperature: [10] } }));

    updateHeatmapColors(view, gridWeather, 'temperature', 0);

    assert.equal(putImageDataCalls.length, 1);
    assert.equal(putImageDataCalls[0].imageData.width, fakeCanvas.width);
    assert.equal(putImageDataCalls[0].imageData.data.length, fakeCanvas.width * fakeCanvas.height * 4);
    assert.equal(setUrlCalls.length, 1);
    assert.equal(setUrlCalls[0], 'data:image/png;base64,FAKE');
    assert.equal(view.overlay, fakeOverlay);
  } finally {
    uninstallStubs();
  }
});

test('setHeatmapVisible adds the overlay to the map when visible, removes it when not', () => {
  const { fakeOverlay, addToCalls } = installStubs();
  try {
    const bbox = { south: 0, north: 10, west: 0, east: 20 };
    const view = createHeatmapView([], bbox);
    const fakeMap = {
      removed: null,
      removeLayer(layer) {
        this.removed = layer;
      },
    };

    setHeatmapVisible(view, fakeMap, true);
    assert.deepEqual(addToCalls, [fakeMap]);

    setHeatmapVisible(view, fakeMap, false);
    assert.equal(fakeMap.removed, fakeOverlay);
  } finally {
    uninstallStubs();
  }
});
