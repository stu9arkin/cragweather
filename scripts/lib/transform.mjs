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

// amenity=* values that indicate a building/venue rather than a real outdoor
// crag. Note: `shelter` is deliberately NOT included here - amenity=shelter
// is legitimately used on natural rock shelters (e.g. Parisella's Caves,
// node/3793198364), which are real outdoor bouldering venues.
const NON_CRAG_AMENITY_VALUES = new Set([
  'community_centre',
  'social_centre',
  'place_of_worship',
  'arts_centre',
  'scout_hall',
  'theatre',
  'cinema',
]);

// Signals that a "crag" is really a commercial/indoor venue or a club's
// facility. All three were checked against the full live Overpass result
// (952 elements, 514 passing the other filters) and produced zero false
// positives: no real outdoor crag carries a postal address, a `brand` tag,
// or a `club` tag.
//
// club=* was initially assumed unsafe because of "Rathgormuck Climbing
// Club" (node/1496777386), which looked like a real outdoor venue from its
// tags alone. It isn't: it's the club's indoor bouldering wall, used in
// winter while the club climbs outdoors elsewhere in summer (see
// https://www.waterfordsportspartnership.ie/rathgormack-climbing-club/).
// Every club=* element in the live dataset (3 total) is a club facility,
// not a natural crag - the other two (Last Sun Dance, West Bromwich Walking
// & Mountaineering Club) are also caught by the leisure/address checks
// above, so `club` is what closes the gap for club-only nodes like this one.
//
// Deliberately NOT used, because real crags carry it:
//   tourism=attraction - Kilnsey Crag, Kyloe in the Woods, Benny Beg
const ADDRESS_KEYS = ['addr:housenumber', 'addr:street', 'addr:housename', 'addr:postcode'];

function hasAddress(tags) {
  return ADDRESS_KEYS.some((key) => Boolean(tags[key]));
}

function isIndoor(tags) {
  return (
    tags.climbing === 'indoor' ||
    tags.indoor === 'yes' ||
    INDOOR_LEISURE_VALUES.has(tags.leisure) ||
    Boolean(tags.building) ||
    Boolean(tags.shop) ||
    NON_CRAG_AMENITY_VALUES.has(tags.amenity) ||
    tags.climbing_wall === 'indoor' ||
    tags['disused:leisure'] === 'sports_centre' ||
    hasAddress(tags) ||
    Boolean(tags.brand) ||
    Boolean(tags.club)
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
