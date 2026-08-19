import { test } from 'node:test';
import assert from 'node:assert/strict';
import { resolveInitialTheme, toggleTheme } from './theme.js';

test('resolveInitialTheme uses the stored theme when one is saved', () => {
  assert.equal(resolveInitialTheme({ stored: 'dark', prefersDark: false }), 'dark');
  assert.equal(resolveInitialTheme({ stored: 'light', prefersDark: true }), 'light');
});

test('resolveInitialTheme falls back to the system preference when nothing is stored', () => {
  assert.equal(resolveInitialTheme({ stored: null, prefersDark: true }), 'dark');
  assert.equal(resolveInitialTheme({ stored: null, prefersDark: false }), 'light');
});

test('resolveInitialTheme ignores an unrecognized stored value and falls back to system preference', () => {
  assert.equal(resolveInitialTheme({ stored: 'sepia', prefersDark: true }), 'dark');
});

test('toggleTheme flips light to dark and dark to light', () => {
  assert.equal(toggleTheme('light'), 'dark');
  assert.equal(toggleTheme('dark'), 'light');
});
