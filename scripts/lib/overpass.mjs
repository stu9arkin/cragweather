export const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };

const OVERPASS_URL = 'https://overpass-api.de/api/interpreter';

export function buildOverpassQuery(bbox = UK_BBOX) {
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

export async function fetchOverpassElements(fetchImpl = fetch, bbox = UK_BBOX) {
  const query = buildOverpassQuery(bbox);
  const response = await fetchImpl(OVERPASS_URL, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/x-www-form-urlencoded',
      'User-Agent': 'cragweather-data-pipeline/1.0 (+https://github.com/stu9arkin/cragweather)',
    },
    body: `data=${encodeURIComponent(query)}`,
  });

  if (!response.ok) {
    throw new Error(`Overpass API returned ${response.status}`);
  }

  const json = await response.json();
  if (!Array.isArray(json.elements)) {
    throw new Error('Overpass API response missing elements array');
  }

  return json.elements;
}
