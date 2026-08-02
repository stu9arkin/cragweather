import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { elementToCrag, elementsToCrags } from './transform.mjs';

const fixturePath = fileURLToPath(
  new URL('./__fixtures__/sample-overpass-response.json', import.meta.url)
);
const fixture = JSON.parse(readFileSync(fixturePath, 'utf8'));

test('elementToCrag extracts a named outdoor node crag', () => {
  const crag = elementToCrag(fixture.elements[0]); // Stanage Edge node
  assert.equal(crag.id, 'node/1001');
  assert.equal(crag.name, 'Stanage Edge');
  assert.equal(crag.lat, 53.3403);
  assert.equal(crag.lon, -1.6294);
  assert.equal(crag.rock, 'gritstone');
  assert.deepEqual(crag.climbingStyles, ['trad']);
});

test('elementToCrag reads coordinates from a way\'s center', () => {
  const crag = elementToCrag(fixture.elements[1]); // Stanage Edge way
  assert.equal(crag.lat, 53.3405);
  assert.equal(crag.lon, -1.6290);
  assert.deepEqual(crag.climbingStyles, ['sport', 'trad']);
});

test('elementToCrag returns null for indoor venues', () => {
  assert.equal(elementToCrag(fixture.elements[2]), null); // City Climb Centre
});

test('elementToCrag returns null for elements with no name', () => {
  assert.equal(elementToCrag(fixture.elements[3]), null);
});

test('elementToCrag handles natural=cliff crags', () => {
  const crag = elementToCrag(fixture.elements[4]); // Dumbarton Rock
  assert.equal(crag.name, 'Dumbarton Rock');
  assert.equal(crag.rock, 'basalt');
  assert.equal(crag.climbingStyles, undefined);
});

test('elementToCrag returns null for building=commercial + leisure=fitness_centre (real-world gym mistagging)', () => {
  assert.equal(elementToCrag(fixture.elements[5]), null); // Redpoint Bristol
});

test('elementToCrag returns null for shop=outdoor (gear shop, not a crag)', () => {
  assert.equal(elementToCrag(fixture.elements[6]), null); // Go Outdoors
});

test('elementToCrag returns null for climbing_wall=indoor', () => {
  assert.equal(elementToCrag(fixture.elements[7]), null); // BlocHaus Climbing
});

test('elementToCrag returns null for any element with a building tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9001,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Some Warehouse Wall', sport: 'climbing', building: 'warehouse' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for any element with a shop tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9002,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Climbers Shop', sport: 'climbing', shop: 'sports' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for disused:leisure=sports_centre, in isolation', () => {
  const element = {
    type: 'node',
    id: 9003,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Old Sports Centre', sport: 'climbing', 'disused:leisure': 'sports_centre' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for amenity=community_centre, in isolation (16th Kilcock Scout Group)', () => {
  assert.equal(elementToCrag(fixture.elements[8]), null); // 16th Kilcock Scout Group
});

test('elementToCrag does NOT return null for amenity=shelter (Parisella\'s Caves, a real rock shelter)', () => {
  const crag = elementToCrag(fixture.elements[9]); // Parisella's Caves
  assert.notEqual(crag, null);
  assert.equal(crag.id, 'node/3793198364');
  assert.equal(crag.name, "Parisella's Caves");
  assert.deepEqual(crag.climbingStyles, ['boulder']);
});

test('elementToCrag returns null for leisure values like climbing_hall, high_ropes_course, sports_hall', () => {
  for (const leisure of ['climbing_hall', 'high_ropes_course', 'sports_hall']) {
    const element = {
      type: 'node',
      id: 9004,
      lat: 51.0,
      lon: -1.0,
      tags: { name: `Test ${leisure}`, sport: 'climbing', leisure },
    };
    assert.equal(elementToCrag(element), null, `expected leisure=${leisure} to be filtered`);
  }
});

test('elementToCrag returns null for any element with an addr:street tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9005,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Some Venue', sport: 'climbing', 'addr:street': 'High Street' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for any element with a brand tag, in isolation', () => {
  const element = {
    type: 'node',
    id: 9006,
    lat: 51.0,
    lon: -1.0,
    tags: { name: 'Some Chain Gym', sport: 'climbing', brand: 'Some Chain' },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for The Climbing Station (real-world indoor gym with no leisure/building/shop tags)', () => {
  const element = {
    type: 'node',
    id: 2465942518,
    lat: 52.7697544,
    lon: -1.1917757,
    tags: {
      'addr:city': 'Loughborough',
      'addr:housename': 'The Climbing Station',
      'addr:postcode': 'LE11 1RH',
      'addr:street': 'Empress Road',
      internet_access: 'wlan',
      name: 'The Climbing Station',
      phone: '+44 1509 217 636',
      sport: 'climbing',
      website: 'https://theclimbingstation.com/',
      wheelchair: 'limited',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for Southampton Climbing Wall (real-world indoor gym, addr:street only)', () => {
  const element = {
    type: 'node',
    id: 3362564126,
    lat: 50.9,
    lon: -1.4,
    tags: {
      'addr:street': 'St Marys Road',
      name: 'Southampton Climbing Wall',
      sport: 'climbing',
      website: 'southamptonclimbingwall.co.uk',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for Granite Planet Climbing (real-world indoor gym in an industrial unit)', () => {
  const element = {
    type: 'node',
    id: 9209667613,
    lat: 50.2,
    lon: -5.2,
    tags: {
      'addr:street': 'Unit 10 Parkengue Kernik Industrial Estate',
      name: 'Granite Planet Climbing',
      sport: 'climbing',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for Eden Rock Carlisle (real-world indoor gym)', () => {
  const element = {
    type: 'node',
    id: 11033796951,
    lat: 54.89,
    lon: -2.93,
    tags: {
      'addr:housenumber': '9',
      'addr:street': 'Brunel Way',
      name: 'Eden Rock Carlisle',
      phone: '+441228 522 127',
      sport: 'climbing',
      website: 'https://www.edenrockclimbing.com/contact-carlisle',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for West Bromwich Walking & Mountaineering Club (a club HQ, not a crag)', () => {
  const element = {
    type: 'node',
    id: 13574656592,
    lat: 52.52,
    lon: -1.99,
    tags: {
      'addr:housename': 'The Red Lion PH',
      'addr:housenumber': '190',
      'addr:street': 'All Saints Way',
      check_date: '2026-02-17',
      club: 'sport',
      'contact:facebook': 'https://www.facebook.com/profile.php?id=100064679917542',
      email: 'hut-secretary@wbmc.org',
      name: 'West Bromwich Walking & Mountaineering Club',
      short_name: 'WBMC',
      sport: 'climbing',
      start_date: '1952-01-13',
      website: 'https://wbmc.org',
      wikidata: 'Q7984587',
      wikipedia: 'en:West Bromwich Mountaineering Club',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag returns null for Go Ape! Sherwood Pines (real-world high-ropes adventure park, brand tag only)', () => {
  const element = {
    type: 'way',
    id: 44373894,
    center: { lat: 53.18, lon: -1.03 },
    tags: {
      area: 'yes',
      brand: 'Go Ape',
      'brand:website': 'https://goape.co.uk/',
      'brand:wikidata': 'Q5574692',
      'brand:wikipedia': 'en:Go Ape',
      name: 'Go Ape! Sherwood Pines',
      sport: 'climbing',
      tourism: 'attraction',
      website: 'https://goape.co.uk/locations/sherwood-pines',
    },
  };
  assert.equal(elementToCrag(element), null);
});

test('elementToCrag does NOT return null for Kilnsey Crag (real outdoor crag tagged tourism=attraction)', () => {
  const element = {
    type: 'way',
    id: 20002,
    center: { lat: 54.03, lon: -2.03 },
    tags: { name: 'Kilnsey Crag', sport: 'climbing', tourism: 'attraction' },
  };
  assert.notEqual(elementToCrag(element), null);
});

test('elementToCrag does NOT return null for Rathgormuck Climbing Club (real outdoor crag tagged only with club=sport)', () => {
  const element = {
    type: 'node',
    id: 20001,
    lat: 52.23,
    lon: -7.53,
    tags: { club: 'sport', name: 'Rathgormuck Climbing Club', sport: 'climbing' },
  };
  const crag = elementToCrag(element);
  assert.notEqual(crag, null);
  assert.equal(crag.name, 'Rathgormuck Climbing Club');
});

test('elementsToCrags maps and drops nulls, but does not dedupe', () => {
  // 10 fixture elements: Stanage node + Stanage way (both valid, dedup is a
  // separate step handled in Task 5/7, not here), 1 indoor (dropped),
  // 1 unnamed (dropped), 1 Dumbarton Rock (valid), 4 real-world indoor
  // mistagging shapes (building+leisure, shop, climbing_wall, amenity
  // community_centre - all dropped), 1 amenity=shelter real crag (valid)
  // => 4 results
  const crags = elementsToCrags(fixture.elements);
  assert.equal(crags.length, 4);
  assert.deepEqual(
    crags.map((c) => c.name).sort(),
    ['Dumbarton Rock', "Parisella's Caves", 'Stanage Edge', 'Stanage Edge']
  );
});
