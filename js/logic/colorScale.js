const NEUTRAL_COLOR = '#9e9e9e';

const TEMPERATURE_STOPS = [
  { value: -5, color: '#2166ac' },
  { value: 0, color: '#4393c3' },
  { value: 5, color: '#92c5de' },
  { value: 10, color: '#f7f7f7' },
  { value: 15, color: '#fddbc7' },
  { value: 20, color: '#f4a582' },
  { value: 25, color: '#d6604d' },
  { value: 30, color: '#b2182b' },
];

const RAINFALL_STOPS = [
  { value: 0, color: '#f7fbff' },
  { value: 0.5, color: '#c6dbef' },
  { value: 2, color: '#6baed6' },
  { value: 5, color: '#2171b5' },
  { value: 10, color: '#08306b' },
];

export function getNeutralColor() {
  return NEUTRAL_COLOR;
}

export function temperatureColor(celsius) {
  return interpolateStops(TEMPERATURE_STOPS, celsius);
}

export function rainfallColor(mm) {
  return interpolateStops(RAINFALL_STOPS, mm);
}

export function getLegendStops(variable) {
  const stops = variable === 'rainfall' ? RAINFALL_STOPS : TEMPERATURE_STOPS;
  const unit = variable === 'rainfall' ? 'mm' : '°C';
  return stops.map((stop) => ({
    value: stop.value,
    color: stop.color,
    label: `${stop.value}${unit}`,
  }));
}

function interpolateStops(stops, value) {
  if (value === null || value === undefined || Number.isNaN(value)) {
    return NEUTRAL_COLOR;
  }

  // Clamp to range
  let clamped = value;
  if (clamped < stops[0].value) clamped = stops[0].value;
  if (clamped > stops[stops.length - 1].value) clamped = stops[stops.length - 1].value;

  // Find the two stops to interpolate between
  for (let i = 0; i < stops.length - 1; i++) {
    const a = stops[i];
    const b = stops[i + 1];
    if (clamped >= a.value && clamped <= b.value) {
      const t = (clamped - a.value) / (b.value - a.value);
      return mixColors(a.color, b.color, t);
    }
  }

  // Should not reach here, but return neutral as fallback
  return NEUTRAL_COLOR;
}

function mixColors(hexA, hexB, t) {
  const a = hexToRgb(hexA);
  const b = hexToRgb(hexB);
  const r = Math.round(a.r + (b.r - a.r) * t);
  const g = Math.round(a.g + (b.g - a.g) * t);
  const bl = Math.round(a.b + (b.b - a.b) * t);
  return `rgb(${r}, ${g}, ${bl})`;
}

function hexToRgb(hex) {
  const clean = hex.replace('#', '');
  return {
    r: parseInt(clean.slice(0, 2), 16),
    g: parseInt(clean.slice(2, 4), 16),
    b: parseInt(clean.slice(4, 6), 16),
  };
}
