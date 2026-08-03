// js/searchView.test.mjs
import { test } from 'node:test';
import assert from 'node:assert/strict';
import { initSearch } from './searchView.js';

const CRAGS = [
  { id: '1', name: 'Stanage Edge', lat: 53.34, lon: -1.62 },
  { id: '2', name: 'Black Rocks', lat: 53.09, lon: -1.55 },
  { id: '3', name: 'Portland', lat: 50.55, lon: -2.45 },
];

function makeElement() {
  return {
    _handlers: {},
    className: '',
    textContent: '',
    id: '',
    value: '',
    hidden: true,
    children: [],
    attributes: {},
    addEventListener(eventName, handler) {
      (this._handlers[eventName] = this._handlers[eventName] || []).push(handler);
    },
    fire(eventName, eventObj = {}) {
      (this._handlers[eventName] || []).forEach((handler) => handler(eventObj));
    },
    setAttribute(name, value) {
      this.attributes[name] = value;
    },
    getAttribute(name) {
      return this.attributes[name] ?? null;
    },
    removeAttribute(name) {
      delete this.attributes[name];
    },
    appendChild(child) {
      this.children.push(child);
    },
    replaceChildren() {
      this.children = [];
    },
  };
}

function installDom() {
  const input = makeElement();
  const list = makeElement();

  globalThis.document = {
    getElementById: (id) => ({ 'search-input': input, 'search-results': list }[id] ?? null),
    createElement: () => makeElement(),
  };

  return { input, list };
}

function uninstallDom() {
  delete globalThis.document;
}

const noop = () => {};

test('typing a matching query renders results and opens the list', () => {
  const { input, list } = installDom();
  try {
    initSearch({ crags: CRAGS, onSelect: noop });
    input.value = 'stan';
    input.fire('input');

    assert.equal(list.hidden, false);
    assert.equal(list.children.length, 1);
    // Each result li has two children: a name span and a coords span --
    // li.children[0] is the name span (see js/searchView.js render()).
    assert.equal(list.children[0].children[0].textContent, 'Stanage Edge');
    assert.equal(list.children[0].children[1].textContent, '53.34, -1.62');
    assert.equal(input.getAttribute('aria-expanded'), 'true');
  } finally {
    uninstallDom();
  }
});

test('duplicate crag names are disambiguated by their coordinate line', () => {
  const DUPLICATE_CRAGS = [
    { id: '1', name: 'Bamford Edge', lat: 53.34, lon: -1.62 },
    { id: '2', name: 'Bamford Edge', lat: 53.35, lon: -1.63 },
  ];
  const { input, list } = installDom();
  try {
    initSearch({ crags: DUPLICATE_CRAGS, onSelect: noop });
    input.value = 'bamford';
    input.fire('input');

    assert.equal(list.children.length, 2);
    assert.equal(list.children[0].children[0].textContent, 'Bamford Edge');
    assert.equal(list.children[1].children[0].textContent, 'Bamford Edge');
    // Same name, but the coordinate lines must differ to disambiguate.
    const coords0 = list.children[0].children[1].textContent;
    const coords1 = list.children[1].children[1].textContent;
    assert.notEqual(coords0, coords1);
    assert.equal(coords0, '53.34, -1.62');
    assert.equal(coords1, '53.35, -1.63');
  } finally {
    uninstallDom();
  }
});

test('typing a query with no matches shows a "No matches" row', () => {
  const { input, list } = installDom();
  try {
    initSearch({ crags: CRAGS, onSelect: noop });
    input.value = 'zzzzzqqqq';
    input.fire('input');

    assert.equal(list.hidden, false);
    assert.equal(list.children.length, 1);
    assert.equal(list.children[0].textContent, 'No matches');
  } finally {
    uninstallDom();
  }
});

test('clearing the query closes the list', () => {
  const { input, list } = installDom();
  try {
    initSearch({ crags: CRAGS, onSelect: noop });
    input.value = 'stan';
    input.fire('input');
    input.value = '';
    input.fire('input');

    assert.equal(list.hidden, true);
  } finally {
    uninstallDom();
  }
});

test('ArrowDown/ArrowUp move the highlighted result, clamped to the list bounds', () => {
  const { input, list } = installDom();
  try {
    initSearch({ crags: CRAGS, onSelect: noop });
    input.value = 'a'; // substring-matches all three sample crag names
    input.fire('input');
    assert.equal(list.children.length, 3);

    input.fire('keydown', { key: 'ArrowDown', preventDefault: noop });
    assert.equal(list.children[0].className, 'search-result active');

    input.fire('keydown', { key: 'ArrowUp', preventDefault: noop });
    // clamped at the top: first result stays highlighted
    assert.equal(list.children[0].className, 'search-result active');
  } finally {
    uninstallDom();
  }
});

test('ArrowDown clamps at the bottom of the list', () => {
  const { input, list } = installDom();
  try {
    initSearch({ crags: CRAGS, onSelect: noop });
    input.value = 'a'; // substring-matches all three sample crag names
    input.fire('input');
    assert.equal(list.children.length, 3);

    // Fire ArrowDown more times than there are results.
    for (let i = 0; i < 5; i++) {
      input.fire('keydown', { key: 'ArrowDown', preventDefault: noop });
    }

    const lastIndex = list.children.length - 1;
    assert.ok(list.children[lastIndex].className.includes('active'));
    // Only the last result should be highlighted.
    assert.ok(!list.children[0].className.includes('active'));
  } finally {
    uninstallDom();
  }
});

test('Enter selects the highlighted result, fills the input, and closes the list', () => {
  const { input, list } = installDom();
  try {
    let selected = null;
    initSearch({
      crags: CRAGS,
      onSelect: (crag) => {
        selected = crag;
      },
    });
    input.value = 'stan';
    input.fire('input');
    input.fire('keydown', { key: 'ArrowDown', preventDefault: noop });
    input.fire('keydown', { key: 'Enter', preventDefault: noop });

    assert.equal(selected.name, 'Stanage Edge');
    assert.equal(input.value, 'Stanage Edge');
    assert.equal(list.hidden, true);
  } finally {
    uninstallDom();
  }
});

test('Enter with no result highlighted yet selects the top match', () => {
  const { input } = installDom();
  try {
    let selected = null;
    initSearch({
      crags: CRAGS,
      onSelect: (crag) => {
        selected = crag;
      },
    });
    input.value = 'stan';
    input.fire('input');
    input.fire('keydown', { key: 'Enter', preventDefault: noop });

    assert.equal(selected.name, 'Stanage Edge');
  } finally {
    uninstallDom();
  }
});

test('Escape closes the list without selecting', () => {
  const { input, list } = installDom();
  try {
    let selected = null;
    initSearch({
      crags: CRAGS,
      onSelect: (crag) => {
        selected = crag;
      },
    });
    input.value = 'stan';
    input.fire('input');
    input.fire('keydown', { key: 'Escape', preventDefault: noop });

    assert.equal(list.hidden, true);
    assert.equal(selected, null);
  } finally {
    uninstallDom();
  }
});

test('clicking a result (mousedown) selects it directly', () => {
  const { input, list } = installDom();
  try {
    let selected = null;
    initSearch({
      crags: CRAGS,
      onSelect: (crag) => {
        selected = crag;
      },
    });
    input.value = 'rocks';
    input.fire('input');
    list.children[0].fire('mousedown', { preventDefault: noop });

    assert.equal(selected.name, 'Black Rocks');
    assert.equal(list.hidden, true);
  } finally {
    uninstallDom();
  }
});
