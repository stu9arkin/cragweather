import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEFAULT_OVERRIDES_PATH = fileURLToPath(new URL('../crag-overrides.json', import.meta.url));

export function loadOverrides(path = DEFAULT_OVERRIDES_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

const REQUIRED_INCLUDE_FIELDS = ['id', 'name', 'lat', 'lon'];

function validateIncludeEntry(entry, index) {
  for (const field of REQUIRED_INCLUDE_FIELDS) {
    if (entry[field] === undefined || entry[field] === null) {
      throw new Error(`crag-overrides.json include[${index}] is missing required field '${field}'`);
    }
  }
  if (typeof entry.lat !== 'number' || Number.isNaN(entry.lat) || typeof entry.lon !== 'number' || Number.isNaN(entry.lon)) {
    throw new Error(`crag-overrides.json include[${index}] has non-numeric lat/lon`);
  }
}

export function applyOverrides(crags, overrides) {
  const excludeIds = new Set(overrides.exclude || []);
  const kept = crags.filter((crag) => !excludeIds.has(crag.id));
  const include = overrides.include || [];
  include.forEach(validateIncludeEntry);
  return [...kept, ...include];
}
