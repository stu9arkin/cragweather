export const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export function buildNarrowOverpassQuery(bbox = UK_BBOX) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return (
    `[out:json][timeout:60][bbox:${bboxStr}];` +
    `(` +
    `node["sport"="climbing"];` +
    `way["sport"="climbing"];` +
    `node["natural"="cliff"]["climbing"];` +
    `way["natural"="cliff"]["climbing"];` +
    `);` +
    `out center tags;`
  );
}

export function buildBroadenedOverpassQuery(bbox = UK_BBOX) {
  const bboxStr = `${bbox.south},${bbox.west},${bbox.north},${bbox.east}`;
  return (
    `[out:json][timeout:110][bbox:${bboxStr}];` +
    `(` +
    `node["natural"="bare_rock"]["name"];` +
    `way["natural"="bare_rock"]["name"];` +
    `node["natural"="cliff"]["name"];` +
    `way["natural"="cliff"]["name"];` +
    `);` +
    `out center tags;`
  );
}

const MAX_ATTEMPTS = 3;
const RETRY_BACKOFF_MS = 2000;
const REQUEST_TIMEOUT_MS = 120_000;

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

async function fetchQueryWithRetry(fetchImpl, query, retryBackoffMs, maxAttempts) {
  let lastError;
  for (let attempt = 1; attempt <= maxAttempts; attempt++) {
    let response;
    try {
      response = await fetchImpl(OVERPASS_URL, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/x-www-form-urlencoded',
          'User-Agent': 'cragweather-data-pipeline/1.0 (+https://github.com/stu9arkin/cragweather)',
        },
        body: `data=${encodeURIComponent(query)}`,
        signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
      });
    } catch (error) {
      // Network error / fetchImpl threw - retryable.
      lastError = error;
      if (attempt < maxAttempts) {
        await sleep(retryBackoffMs);
        continue;
      }
      throw error;
    }

    if (!response.ok) {
      if (isRetryableStatus(response.status) && attempt < maxAttempts) {
        lastError = new Error(`Overpass API returned ${response.status}`);
        await sleep(retryBackoffMs);
        continue;
      }
      throw new Error(`Overpass API returned ${response.status}`);
    }

    const json = await response.json();

    if (json.remark) {
      lastError = new Error(`Overpass API error: ${json.remark}`);
      if (attempt < maxAttempts) {
        await sleep(retryBackoffMs);
        continue;
      }
      throw lastError;
    }

    // A 200 with a malformed body is a real bug, not a transient failure -
    // do not retry, throw immediately.
    if (!Array.isArray(json.elements)) {
      throw new Error('Overpass API response missing elements array');
    }

    return json.elements;
  }

  // Should be unreachable (the loop always returns or throws), but keep a
  // safety net in case maxAttempts is misconfigured to 0.
  throw lastError ?? new Error('Overpass API request failed with no attempts made');
}

export async function fetchOverpassElements(
  fetchImpl = fetch,
  bbox = UK_BBOX,
  { retryBackoffMs = RETRY_BACKOFF_MS, maxAttempts = MAX_ATTEMPTS } = {}
) {
  const narrowElements = await fetchQueryWithRetry(
    fetchImpl,
    buildNarrowOverpassQuery(bbox),
    retryBackoffMs,
    maxAttempts
  );
  const broadenedElements = await fetchQueryWithRetry(
    fetchImpl,
    buildBroadenedOverpassQuery(bbox),
    retryBackoffMs,
    maxAttempts
  );
  // Narrow must come first: dedupeCrags (scripts/lib/dedupe.mjs) is
  // first-wins on same-name/same-location collisions, and the narrow query's
  // climbing-tagged elements carry richer metadata (rock, climbingStyles,
  // access, description) than a same-named broadened-query element, which
  // typically has none of those optional fields. Swapping this order would
  // silently strip that metadata from existing crags.
  return [...narrowElements, ...broadenedElements];
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}
