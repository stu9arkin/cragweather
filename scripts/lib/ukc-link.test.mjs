import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildUkcSearchUrl } from './ukc-link.mjs';

test('builds a UKC logbook search URL for a simple name', () => {
  const url = buildUkcSearchUrl('Stanage Edge');
  assert.equal(
    url,
    'https://www.ukclimbing.com/logbook/search/?sort=score&query=Stanage%20Edge&type=all'
  );
});

test('URL-encodes special characters in the crag name', () => {
  const url = buildUkcSearchUrl("Anglezarke & Stronstrey Bank");
  assert.equal(
    url,
    'https://www.ukclimbing.com/logbook/search/?sort=score&query=Anglezarke%20%26%20Stronstrey%20Bank&type=all'
  );
  assert.ok(url.includes('%26'), 'raw & from the name must be percent-encoded, not left as a query separator');
});
