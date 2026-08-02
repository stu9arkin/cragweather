// js/logic/gridToImageData.js
import { colorForVariable } from './colorScale.js';

// Converts an interpolated value raster (from interpolateGrid) into RGBA
// bytes suitable for wrapping in an ImageData. Each value is mapped through
// the existing colorForVariable() scale; NaN values (no-data, e.g. missing
// weather data at that location) render fully transparent rather than any
// fabricated or neutral color.
export function gridToImageData({ width, height, data }, variable) {
  const colorFn = colorForVariable(variable);
  const rgba = new Uint8ClampedArray(width * height * 4);

  for (let i = 0; i < data.length; i++) {
    const value = data[i];
    const offset = i * 4;
    if (Number.isNaN(value)) {
      rgba[offset + 3] = 0;
      continue;
    }
    const { r, g, b } = parseColor(colorFn(value));
    rgba[offset] = r;
    rgba[offset + 1] = g;
    rgba[offset + 2] = b;
    rgba[offset + 3] = 255;
  }

  return rgba;
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
