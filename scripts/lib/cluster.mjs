import { elementCoord, haversineMeters } from './geo.mjs';

export function isSeed(tags) {
  return (
    tags.sport === 'climbing' ||
    tags.climbing !== undefined ||
    /clim/i.test(tags['source:name'] || '')
  );
}

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
