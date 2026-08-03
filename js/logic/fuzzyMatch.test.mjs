import { test } from 'node:test';
import assert from 'node:assert/strict';
import { levenshteinDistance, matchScore } from './fuzzyMatch.js';

test('levenshteinDistance counts a single insertion as distance 1', () => {
  assert.equal(levenshteinDistance('roks', 'rocks'), 1);
});

test('levenshteinDistance counts an adjacent transposition as distance 2', () => {
  assert.equal(levenshteinDistance('protland', 'portland'), 2);
});

test('matchScore returns null for an empty or whitespace-only query', () => {
  assert.equal(matchScore('', 'Stanage Edge'), null);
  assert.equal(matchScore('   ', 'Stanage Edge'), null);
});

test('matchScore is case-insensitive and scores a prefix substring match as 0', () => {
  assert.equal(matchScore('STAN', 'Stanage Edge'), 0);
});

test('matchScore scores a mid-string substring match as its character index', () => {
  assert.equal(matchScore('edge', 'Stanage Edge'), 8);
});

test('matchScore falls back to word-level fuzzy matching for typos', () => {
  // "roks" isn't a substring of "Black Rocks", but it's one insertion away
  // from the word "Rocks" (distance 1) -- checking whole-name distance
  // alone would miss this because "roks" vs "black rocks" is far apart.
  assert.equal(matchScore('roks', 'Black Rocks'), 1001);
});

test('matchScore fuzzy-matches a small typo against the whole name', () => {
  assert.equal(matchScore('protland', 'Portland'), 1002);
});

test('matchScore ranks a substring match below the fuzzy-match offset', () => {
  const substringScore = matchScore('edge', 'Stanage Edge');
  const fuzzyScore = matchScore('eadge', 'Edge Hill'); // no substring match, 1 insertion away
  assert.ok(substringScore < 1000);
  assert.ok(fuzzyScore >= 1000);
});

test('matchScore returns null when the typo distance is too large relative to the query', () => {
  assert.equal(matchScore('xyz123', 'Portland'), null);
});

test('matchScore returns null for a very long, clearly-non-matching query without computing full Levenshtein distance', () => {
  // A huge length difference between the query and every candidate word
  // means the length-based lower bound alone rules out a match, so the
  // fuzzy-fallback short-circuit in bestWordDistance should skip the
  // O(m*n) DP computation entirely rather than running it against a
  // 500-character string.
  const longQuery = 'x'.repeat(500);
  assert.equal(matchScore(longQuery, 'Stanage Edge'), null);
});
