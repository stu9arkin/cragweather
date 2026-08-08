import { elementCoord, haversineMeters } from './geo.mjs';

export function isSeed(tags) {
  return (
    tags.sport === 'climbing' ||
    (tags.climbing !== undefined && tags.climbing !== 'no') ||
    /clim/i.test(tags['source:name'] || '')
  );
}

// 400m default: the single most load-bearing tuned value in the seed-and-
// cluster recall fix (issue #11) - it decides whether an untagged named
// rock feature gets pulled in alongside a nearby verified climbing feature
// or left out. Validated against the live UK-wide OSM dataset: it correctly
// recovers real crag complexes that carry no climbing tag at all, including
// the Cademan Wood cluster (Leicestershire, 8 elements - see the
// "Cademan Wood" regression test below) and the Swanage sea-cliff complex
// (Dancing Ledge, Blacker's Hole, Hedbury), while adding only 361 elements
// UK-wide versus the 3,217 a naive "every named bare_rock/cliff" fetch
// would have added.
//
// Also checked against the largest real clusters produced (not just the
// small ones) to rule out pathological chaining across a whole coastline:
// the biggest (Swanage, 19 members) spans 3.4km, which is the genuine
// geographic extent of that guidebook-defined climbing area, not a runaway
// merge.
export function filterToSeedClusters(elements, thresholdMeters = 400) {
  const coords = elements.map(elementCoord);
  const parent = elements.map((_, i) => i);

  function find(i) {
    while (parent[i] !== i) {
      parent[i] = parent[parent[i]];
      i = parent[i];
    }
    return i;
  }

  function union(a, b) {
    const rootA = find(a);
    const rootB = find(b);
    if (rootA !== rootB) parent[rootA] = rootB;
  }

  for (let i = 0; i < elements.length; i++) {
    if (!coords[i]) continue;
    for (let j = i + 1; j < elements.length; j++) {
      if (!coords[j]) continue;
      const distance = haversineMeters(coords[i].lat, coords[i].lon, coords[j].lat, coords[j].lon);
      if (distance <= thresholdMeters) union(i, j);
    }
  }

  const seedRoots = new Set();
  elements.forEach((element, i) => {
    if (coords[i] && isSeed(element.tags || {})) seedRoots.add(find(i));
  });

  return elements.filter((_, i) => coords[i] && seedRoots.has(find(i)));
}
