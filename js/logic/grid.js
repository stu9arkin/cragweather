// js/logic/grid.js
export function buildGridPoints(bbox, stepDeg = 1) {
  const lats = axisValues(bbox.south, bbox.north, stepDeg);
  const lons = axisValues(bbox.west, bbox.east, stepDeg);
  const points = [];
  for (const lat of lats) {
    for (const lon of lons) {
      points.push({ lat, lon });
    }
  }
  return points;
}

// Steps from start to end by stepDeg, always including the exact end value
// as the final entry -- even when the range isn't an even multiple of
// stepDeg, in which case the last step is smaller than the others.
function axisValues(start, end, stepDeg) {
  const values = [];
  for (let value = start; value <= end + 1e-9; value += stepDeg) {
    values.push(round(value));
  }
  const last = values[values.length - 1];
  if (Math.abs(last - end) > 1e-9) {
    values.push(round(end));
  }
  return values;
}

function round(value) {
  return Math.round(value * 100) / 100;
}
