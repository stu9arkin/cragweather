const NIGHT_COLOR = '#0d1b3e';
const DAY_COLOR = '#cfe8ff';
// Wide enough that the transition reads as a gradual dawn/dusk rather than
// a hard edge against the 7-day timeline's compressed per-hour width.
const BLEND_MS = 3 * 60 * 60 * 1000;

function colorAt(date, sunTimes) {
  let color = NIGHT_COLOR;
  for (const { sunrise, sunset } of sunTimes) {
    if (date >= sunrise) color = DAY_COLOR;
    if (date >= sunset) color = NIGHT_COLOR;
  }
  return color;
}

export function buildSunGradientStops(sunTimes, timelineStart, timelineEnd) {
  if (!sunTimes || sunTimes.length === 0) return [];

  const spanMs = timelineEnd.getTime() - timelineStart.getTime();
  const toPercent = (date) => ((date.getTime() - timelineStart.getTime()) / spanMs) * 100;

  const stops = [];
  for (const { sunrise, sunset } of sunTimes) {
    for (const [event, preColor, postColor] of [
      [sunrise, NIGHT_COLOR, DAY_COLOR],
      [sunset, DAY_COLOR, NIGHT_COLOR],
    ]) {
      const before = new Date(event.getTime() - BLEND_MS / 2);
      const after = new Date(event.getTime() + BLEND_MS / 2);
      if (before > timelineStart && before < timelineEnd) {
        stops.push({ offsetPercent: toPercent(before), color: preColor });
      }
      if (after > timelineStart && after < timelineEnd) {
        stops.push({ offsetPercent: toPercent(after), color: postColor });
      }
    }
  }

  stops.sort((a, b) => a.offsetPercent - b.offsetPercent);
  stops.unshift({ offsetPercent: 0, color: colorAt(timelineStart, sunTimes) });
  stops.push({ offsetPercent: 100, color: colorAt(timelineEnd, sunTimes) });
  return stops;
}

export function stopsToCssGradient(stops) {
  if (!stops || stops.length === 0) return null;
  const parts = stops.map((s) => `${s.color} ${s.offsetPercent.toFixed(2)}%`);
  return `linear-gradient(to right, ${parts.join(', ')})`;
}
