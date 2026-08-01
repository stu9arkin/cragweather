import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUkcSearchUrl } from './ukc-link.mjs';

test('builds a google site-search URL for a simple name', () => {
  const url = buildUkcSearchUrl('Stanage Edge');
  assert.equal(
    url,
    'https://www.google.com/search?q=site%3Aukclimbing.com%20Stanage%20Edge%20crag'
  );
});

test('URL-encodes special characters in the crag name', () => {
  const url = buildUkcSearchUrl("Anglezarke & Stronstrey Bank");
  assert.ok(url.startsWith('https://www.google.com/search?q='));
  assert.ok(!url.includes('&Stronstrey'), 'raw & from the name must be encoded, not left as a query separator');
});
