// scripts/fetch-crags.mjs
import { mkdir, writeFile } from 'node:fs/promises';
import { pathToFileURL, fileURLToPath } from 'node:url';
import { dirname } from 'node:path';
import { fetchOverpassElements } from './lib/overpass.mjs';
import { elementsToCrags } from './lib/transform.mjs';
import { dedupeCrags } from './lib/dedupe.mjs';
import { buildUkcSearchUrl } from './lib/ukc-link.mjs';

// scripts/fetch-crags.mjs -> ../data/crags.json, resolved against this
// script's own location rather than the process cwd, so the script writes
// to the right place even when invoked from outside the package root.
export const DEFAULT_OUTPUT_PATH = fileURLToPath(new URL('../data/crags.json', import.meta.url));

export async function generateCragsData({ fetchImpl = fetch, outputPath = DEFAULT_OUTPUT_PATH } = {}) {
  const elements = await fetchOverpassElements(fetchImpl);
  const rawCrags = elementsToCrags(elements);
  const deduped = dedupeCrags(rawCrags);

  if (deduped.length === 0) {
    throw new Error('No crags found after transform/dedup - refusing to write an empty crags.json');
  }

  const crags = deduped
    .map((crag) => ({ ...crag, ukcSearchUrl: buildUkcSearchUrl(crag.name) }))
    .sort((a, b) => a.name.localeCompare(b.name, 'en-GB'));

  await mkdir(dirname(outputPath), { recursive: true });
  await writeFile(outputPath, JSON.stringify(crags, null, 2) + '\n');

  return crags;
}

const isMainModule =
  process.argv[1] !== undefined &&
  import.meta.url === pathToFileURL(process.argv[1]).href;

if (isMainModule) {
  generateCragsData()
    .then((crags) => {
      console.log(`Wrote ${crags.length} crags to ${DEFAULT_OUTPUT_PATH}`);
    })
    .catch((error) => {
      console.error(error);
      process.exitCode = 1;
    });
}
