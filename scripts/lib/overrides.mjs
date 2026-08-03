import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';

export const DEFAULT_OVERRIDES_PATH = fileURLToPath(new URL('../crag-overrides.json', import.meta.url));

export function loadOverrides(path = DEFAULT_OVERRIDES_PATH) {
  return JSON.parse(readFileSync(path, 'utf8'));
}

export function applyOverrides(crags, overrides) {
  const excludeIds = new Set(overrides.exclude || []);
  const kept = crags.filter((crag) => !excludeIds.has(crag.id));
  return [...kept, ...(overrides.include || [])];
}
