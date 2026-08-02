// js/logic/gridToImageData.js
import { colorForVariable, getLegendStops } from './colorScale.js';

// Number of samples spanning the color scale's value domain. 1024 is fine
// enough that interpolating between adjacent entries is visually
// indistinguishable from calling colorForVariable() directly -- no banding.
const LUT_SIZE = 1024;

// Converts an interpolated value raster (from interpolateGrid) into RGBA
// bytes suitable for wrapping in an ImageData. Each value is mapped through
// the existing colorForVariable() scale; NaN values (no-data, e.g. missing
// weather data at that location) render fully transparent rather than any
// fabricated or neutral color.
//
// Performance note: colorForVariable() returns a function that builds a
// fresh 'rgb(r, g, b)' string per call, which then has to be re-parsed with
// a regex -- doing that once per pixel (hundreds of thousands of times per
// render) is the dominant cost of this module. Instead, sample the color
// scale into a small lookup table once per call, then do a cheap
// interpolated array lookup per pixel.
export function gridToImageData({ width, height, data }, variable) {
  const lut = buildColorLut(variable);
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const offset = i * 4;
    if (Number.isNaN(value)) {
      rgba[offset + 3] = 0;
      continue;
    }
    const { r, g, b } = lut.colorAt(value);
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = 255;
  }

  return rgba;
}

// Builds a LUT_SIZE-entry table spanning the color scale's real value
// domain -- taken from getLegendStops() so it always matches whatever
// colorScale.js actually defines for `variable`, never hardcoded -- and
// returns a colorAt(value) accessor that linearly interpolates between the
// two nearest LUT entries (matching colorForVariable's own clamp-to-range
// behavior for out-of-domain values). colorForVariable's underlying scale
// is itself piecewise-linear in RGB space between stops, so interpolating
// a sufficiently fine LUT reproduces it with no visible banding.
function buildColorLut(variable) {
  const colorFn = colorForVariable(variable);
  const stops = getLegendStops(variable);
  const min = stops[0].value;
  const max = stops[stops.length - 1].value;
  const span = max - min;

  const r = new Float64Array(LUT_SIZE);
  const g = new Float64Array(LUT_SIZE);
  const b = new Float64Array(LUT_SIZE);
  for (let i = 0; i < LUT_SIZE; i++) {
    const sampleValue = min + (i / (LUT_SIZE - 1)) * span;
    const parsed = parseColor(colorFn(sampleValue));
    r[i] = parsed.r;
    g[i] = parsed.g;
    b[i] = parsed.b;
  }

  return {
    colorAt(value) {
      const clamped = value < min ? min : value > max ? max : value;
      const pos = ((clamped - min) / span) * (LUT_SIZE - 1);
      const idx0 = Math.floor(pos);
      const idx1 = idx0 + 1 < LUT_SIZE ? idx0 + 1 : idx0;
      const t = pos - idx0;
      return {
        r: r[idx0] + (r[idx1] - r[idx0]) * t,
        g: g[idx0] + (g[idx1] - g[idx0]) * t,
        b: b[idx0] + (b[idx1] - b[idx0]) * t,
      };
    },
  };
}

function parseColor(colorStr) {
  if (colorStr.startsWith('#')) {
    return {
      r: parseInt(colorStr.slice(1, 3), 16),
      g: parseInt(colorStr.slice(3, 5), 16),
      b: parseInt(colorStr.slice(5, 7), 16),
    };
  }
  const [, r, g, b] = colorStr.match(/rgb\((\d+),\s*(\d+),\s*(\d+)\)/);
  return { r: Number(r), g: Number(g), b: Number(b) };
}
