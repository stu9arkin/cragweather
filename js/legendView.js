// js/legendView.js
import { getLegendStops } from './logic/colorScale.js';

export function renderLegend(container, variable) {
  const stops = getLegendStops(variable);

  container.innerHTML = '';

  const scale = document.createElement('div');
  scale.className = 'legend-scale';
  for (const stop of stops) {
    const swatch = document.createElement('span');
    swatch.className = 'legend-swatch';
    swatch.style.background = stop.color;
    swatch.title = stop.label;
    scale.appendChild(swatch);
  }

  const labels = document.createElement('div');
  labels.className = 'legend-labels';
  labels.textContent = `${stops[0].label} — ${stops[stops.length - 1].label}`;

  container.appendChild(scale);
  container.appendChild(labels);
}
