// js/controls.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initControls, setTimeBarGradient, setThemeToggleState } from './controls.js';
import { getTimeSteps } from './logic/time.js';

function makeInputElement() {
  return {
    _handlers: {},
    value: '',
    max: '',
    style: {},
    hidden: false,
    addEventListener(event, handler) {
      this._handlers[event] = handler;
    },
    fire(event) {
      this._handlers[event]();
    },
  };
}

function makeContainerElement() {
  return {
    children: [],
    replaceChildren() {
      this.children = [];
    },
    appendChild(child) {
      this.children.push(child);
    },
  };
}

function makeLabelElement() {
  return { textContent: '', style: {}, hidden: true };
}

function makeButtonElement() {
  return {
    textContent: '',
    attributes: {},
    _handlers: {},
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
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
    'time-scrollbar': makeInputElement(),
    'time-bar-floating-label': makeLabelElement(),
    'time-bar-ticks': makeContainerElement(),
    'variable-toggle': makeInputElement(),
    'mode-toggle': withModeToggle ? makeInputElement() : null,
    'theme-toggle': makeButtonElement(),
  };

  globalThis.document = {
    getElementById: (id) => elements[id] ?? null,
    createElement: () => ({ className: '', style: {}, textContent: '' }),
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

test('dragging the time scrollbar updates the floating label text/position and calls onTimeChange', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    let receivedIndex = null;
    initControls({
      onVariableChange: () => {},
      onModeChange: () => {},
      onTimeChange: (index) => {
        receivedIndex = index;
      },
    });

    const timeSteps = getTimeSteps();
    elements['time-scrollbar'].value = '4';
    elements['time-scrollbar'].fire('input');

    assert.equal(receivedIndex, 4);
    assert.equal(elements['time-bar-floating-label'].textContent, timeSteps[4].label);
    assert.equal(elements['time-bar-floating-label'].style.left, `${(4 / (timeSteps.length - 1)) * 100}%`);
  } finally {
    uninstallDom();
  }
});

test('the floating label is hidden by default and shown while the scrollbar is being dragged', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    initControls({ onVariableChange: () => {}, onModeChange: () => {}, onTimeChange: () => {} });

    assert.equal(elements['time-bar-floating-label'].hidden, true);

    elements['time-scrollbar'].fire('pointerdown');
    assert.equal(elements['time-bar-floating-label'].hidden, false);

    elements['time-scrollbar'].fire('pointerup');
    assert.equal(elements['time-bar-floating-label'].hidden, true);
  } finally {
    uninstallDom();
  }
});

test('initControls renders one tick per time step, with major ticks also getting a label element', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    initControls({ onVariableChange: () => {}, onModeChange: () => {}, onTimeChange: () => {} });

    const timeSteps = getTimeSteps();
    const majorCount = timeSteps.filter((s) => s.date.getUTCHours() % 6 === 0).length;
    assert.equal(elements['time-bar-ticks'].children.length, timeSteps.length + majorCount);
  } finally {
    uninstallDom();
  }
});

test('initControls gives midnight tick labels a "day" class and other major-tick labels an "hour" class', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    initControls({ onVariableChange: () => {}, onModeChange: () => {}, onTimeChange: () => {} });

    const timeSteps = getTimeSteps();
    const labelChildren = elements['time-bar-ticks'].children.filter((child) => child.textContent !== '');

    const dayLabels = labelChildren.filter((child) => child.className === 'time-bar-tick-label day');
    const hourLabels = labelChildren.filter((child) => child.className === 'time-bar-tick-label hour');

    assert.ok(dayLabels.length > 0);
    assert.ok(hourLabels.length > 0);
    assert.equal(dayLabels.length + hourLabels.length, labelChildren.length);
    assert.ok(dayLabels.every((child) => /^(Sun|Mon|Tue|Wed|Thu|Fri|Sat)$/.test(child.textContent)));
    assert.ok(hourLabels.every((child) => /^\d{2}:00$/.test(child.textContent)));
  } finally {
    uninstallDom();
  }
});

test('initControls sets the theme-toggle button state to match the given initialTheme', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    initControls({
      onVariableChange: () => {},
      onModeChange: () => {},
      onTimeChange: () => {},
      onThemeToggle: () => {},
      initialTheme: 'dark',
    });

    assert.equal(elements['theme-toggle'].attributes['aria-pressed'], 'true');
    assert.equal(elements['theme-toggle'].attributes['aria-label'], 'Switch to light mode');
    assert.equal(elements['theme-toggle'].textContent, '☾');
  } finally {
    uninstallDom();
  }
});

test('clicking the theme-toggle button calls onThemeToggle', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    let calls = 0;
    initControls({
      onVariableChange: () => {},
      onModeChange: () => {},
      onTimeChange: () => {},
      onThemeToggle: () => {
        calls++;
      },
      initialTheme: 'light',
    });

    elements['theme-toggle'].fire('click');

    assert.equal(calls, 1);
  } finally {
    uninstallDom();
  }
});

test('setThemeToggleState updates the theme-toggle button to reflect the given theme', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    setThemeToggleState('dark');
    assert.equal(elements['theme-toggle'].attributes['aria-pressed'], 'true');
    assert.equal(elements['theme-toggle'].attributes['aria-label'], 'Switch to light mode');
    assert.equal(elements['theme-toggle'].textContent, '☾');

    setThemeToggleState('light');
    assert.equal(elements['theme-toggle'].attributes['aria-pressed'], 'false');
    assert.equal(elements['theme-toggle'].attributes['aria-label'], 'Switch to dark mode');
    assert.equal(elements['theme-toggle'].textContent, '☀');
  } finally {
    uninstallDom();
  }
});

test('setTimeBarGradient applies a CSS linear-gradient string built from the given stops', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    setTimeBarGradient([
      { offsetPercent: 0, color: '#0d1b3e' },
      { offsetPercent: 100, color: '#cfe8ff' },
    ]);
    assert.equal(
      elements['time-scrollbar'].style.background,
      'linear-gradient(to right, #0d1b3e 0.00%, #cfe8ff 100.00%)'
    );
  } finally {
    uninstallDom();
  }
});

test('setTimeBarGradient clears the background when given no stops', () => {
  const elements = installDom({ withModeToggle: false });
  try {
    elements['time-scrollbar'].style.background = 'previous-value';
    setTimeBarGradient([]);
    assert.equal(elements['time-scrollbar'].style.background, '');
  } finally {
    uninstallDom();
  }
});
