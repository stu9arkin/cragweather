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
  assert.ok(url.startsWith('https://www.ukclimbing.com/logbook/search/?sort=score&query='));
  assert.ok(!url.includes('query=Anglezarke &'), 'raw & from the name must be encoded, not left as a query separator');
});
