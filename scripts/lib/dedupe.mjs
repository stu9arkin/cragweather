import { haversineMeters } from './geo.mjs';

export function dedupeCrags(crags, thresholdMeters = 250) {
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
