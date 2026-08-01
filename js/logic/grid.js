// js/logic/grid.js
export function buildGridPoints(bbox, stepDeg = 1) {
  const points = [];
  for (let lat = bbox.south; lat <= bbox.north + 1e-9; lat += stepDeg) {
    for (let lon = bbox.west; lon <= bbox.east + 1e-9; lon += stepDeg) {
      points.push({ lat: round(lat), lon: round(lon) });
    }
  }
  return points;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
