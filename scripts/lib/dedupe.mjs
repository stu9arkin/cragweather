import { haversineMeters } from './geo.mjs';

// 1500m default: raised from 250m after analyzing every same-name duplicate
// group in the live UK-wide dataset (issue #28). Pairwise distances within
// same-name groups came out cleanly bimodal: either under ~1.5km apart -
// almost always the same real-world crag mapped in OSM as several adjacent
// way/node segments sharing one name (e.g. Curbar Edge, Stanage Edge,
// Wharncliffe Crags) - or several km to hundreds of km apart, always a
// different crag that happens to share a generic/common name (e.g. "Central
// Buttress", "The Pinnacle", "Agden Rocher"). No group fell in between: the
// largest "same crag" spread was 1477m and the smallest "different crag"
// gap was 2936m, so 1500m merges every genuine multi-way crag complex while
// leaving every coincidentally-named distinct crag untouched.
export function dedupeCrags(crags, thresholdMeters = 1500) {
  const kept = [];
  for (const crag of crags) {
    const isDuplicate = kept.some(
      (existing) =>
        existing.name.toLowerCase() === crag.name.toLowerCase() &&
        haversineMeters(existing.lat, existing.lon, crag.lat, crag.lon) <=
          thresholdMeters
    );
    if (!isDuplicate) kept.push(crag);
  }
  return kept;
}
