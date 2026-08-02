// js/controls.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initControls } from './controls.js';

function makeElement() {
  return {
    _handlers: {},
    value: '',
    textContent: '',
    addEventListener(event, handler) {
      this._handlers[event] = handler;
    },
    fire(event) {
      this._handlers[event]();
    },
  };
}

function installDom({ withModeToggle }) {
  const elements = {
    'time-scrollbar': makeElement(),
    'time-label': makeElement(),
    'variable-toggle': makeElement(),
    'mode-toggle': withModeToggle ? makeElement() : null,
  };

  globalThis.document = {
    getElementById: (id) => elements[id] ?? null,
  };

  return elements;
}

function uninstallDom() {
  delete globalThis.document;
}

test('initControls does not throw and never calls onModeChange when #mode-toggle is absent', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    let modeChangeCalls = 0;
    assert.doesNotThrow(() => {
      initControls({
        onVariableChange: () => {},
        onModeChange: () => {
          modeChangeCalls++;
        },
        onTimeChange: () => {},
      });
    });
    elements['variable-toggle'].value = 'rainfall';
    elements['variable-toggle'].fire('change');
    assert.equal(modeChangeCalls, 0);
  } finally {
    uninstallDom();
  }
});

test('initControls still wires onModeChange when #mode-toggle is present', () => {
  const elements = installDom({ withModeToggle: true });
  try {
    let receivedMode = null;
    initControls({
      onVariableChange: () => {},
      onModeChange: (mode) => {
        receivedMode = mode;
      },
      onTimeChange: () => {},
    });
    elements['mode-toggle'].value = 'heatmap';
    elements['mode-toggle'].fire('change');
    assert.equal(receivedMode, 'heatmap');
  } finally {
    uninstallDom();
  }
});
