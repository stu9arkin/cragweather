import { matchScore } from './fuzzyMatch.js';

const DEFAULT_LIMIT = 8;

export function searchCrags(crags, query, limit = DEFAULT_LIMIT) {
  if (!query || query.trim().length === 0) return [];

  const scored = [];
  for (const crag of crags) {
    const score = matchScore(query, crag.name);
    if (score !== null) scored.push({ crag, score });
  }

  scored.sort((a, b) => a.score - b.score);
  return scored.slice(0, limit).map((entry) => entry.crag);
}
