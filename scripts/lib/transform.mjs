function elementToCoord(element) {
  if (element.type === 'node' && typeof element.lat === 'number') {
    return { lat: element.lat, lon: element.lon };
  }
  if (element.center && typeof element.center.lat === 'number') {
    return { lat: element.center.lat, lon: element.center.lon };
  }
  return null;
}

const INDOOR_LEISURE_VALUES = new Set([
  'climbing_wall',
  'climbing_hall',
  'fitness_centre',
  'fitness_station',
  'sports_hall',
  'sports_centre',
  'high_ropes_course',
]);

function isIndoor(tags) {
  return (
    tags.climbing === 'indoor' ||
    tags.indoor === 'yes' ||
    INDOOR_LEISURE_VALUES.has(tags.leisure) ||
    Boolean(tags.building) ||
    Boolean(tags.shop) ||
    Boolean(tags.amenity) ||
    tags.climbing_wall === 'indoor' ||
    tags['disused:leisure'] === 'sports_centre'
  );
}

function extractClimbingStyles(tags) {
  const styles = Object.entries(tags)
    .filter(([key, value]) => key.startsWith('climbing:') && value === 'yes')
    .map(([key]) => key.slice('climbing:'.length));
  return styles.sort();
}

export function elementToCrag(element) {
  const tags = element.tags || {};
  if (!tags.name) return null;
  if (isIndoor(tags)) return null;

  const coord = elementToCoord(element);
  if (!coord) return null;

  const crag = {
    id: `${element.type}/${element.id}`,
    name: tags.name,
    lat: coord.lat,
    lon: coord.lon,
  };

  if (tags.rock) crag.rock = tags.rock;

  const styles = extractClimbingStyles(tags);
  if (styles.length > 0) crag.climbingStyles = styles;

  if (tags.access) crag.access = tags.access;
  if (tags.description) crag.description = tags.description;

  return crag;
}

export function elementsToCrags(elements) {
  return elements.map(elementToCrag).filter((crag) => crag !== null);
}
