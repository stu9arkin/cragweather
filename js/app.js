// js/app.js
import { loadCrags } from './cragData.js';
import { fetchWeatherForLocations } from './weatherFetch.js';
import { buildGridPoints } from './logic/grid.js';
import { createMapView, updateMarkerColors, focusCrag } from './mapView.js';
import { createHeatmapView, updateHeatmapColors, setHeatmapVisible } from './heatmapView.js';
import { initControls, setTimeBarGradient } from './controls.js';
import { renderLegend } from './legendView.js';
import { showDetailPanel, initDetailPanel } from './detailPanel.js';
import { initSearch } from './searchView.js';
import { fetchSunTimes } from './sunFetch.js';
import { buildSunGradientStops } from './logic/sunGradient.js';

const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };
const UK_CENTER = { lat: (UK_BBOX.south + UK_BBOX.north) / 2, lon: (UK_BBOX.west + UK_BBOX.east) / 2 };
const GRID_STEP_DEG = 0.5;
// Flip to true and restore the Style dropdown in index.html to re-enable heatmap mode.
const HEATMAP_ENABLED = false;

async function main() {
  initDetailPanel();

  let crags;
  try {
    crags = await loadCrags();
  } catch (error) {
    showErrorBanner('Could not load crag data. Please try refreshing the page.');
    console.error(error);
    return;
  }

  const state = { variable: 'temperature', mode: 'markers', timeIndex: 0 };
  const weatherByCragId = new Map();
  let gridWeather = [];

  const mapView = createMapView('map', crags);
  const gridPoints = HEATMAP_ENABLED ? buildGridPoints(UK_BBOX, GRID_STEP_DEG) : [];
  const heatmapView = HEATMAP_ENABLED ? createHeatmapView(gridPoints, UK_BBOX) : null;

  mapView.map.on('crag:selected', ({ crag }) => {
    showDetailPanel(crag, weatherByCragId.get(crag.id));
  });

  initSearch({
    crags,
    onSelect: (crag) => focusCrag(mapView, crag),
  });

  function render() {
    updateMarkerColors(mapView, weatherByCragId, state.variable, state.timeIndex);
    if (HEATMAP_ENABLED && state.mode === 'heatmap') {
      updateHeatmapColors(heatmapView, gridWeather, state.variable, state.timeIndex);
    }
  }

  renderLegend(document.getElementById('legend'), state.variable);

  // The time scrollbar can fire many `input` events per second during a
  // drag; coalesce those into at most one render() per animation frame so
  // dragging stays smooth. Other state changes (variable/mode/weather
  // resolution) are infrequent and still render immediately.
  let pendingRenderFrame = null;

  const { timeSteps } = initControls({
    onVariableChange: (variable) => {
      state.variable = variable;
      renderLegend(document.getElementById('legend'), state.variable);
      render();
    },
    onModeChange: (mode) => {
      state.mode = mode;
      if (HEATMAP_ENABLED) setHeatmapVisible(heatmapView, mapView.map, mode === 'heatmap');
      render();
    },
    onTimeChange: (index) => {
      state.timeIndex = index;
      if (pendingRenderFrame !== null) cancelAnimationFrame(pendingRenderFrame);
      pendingRenderFrame = requestAnimationFrame(() => {
        pendingRenderFrame = null;
        render();
      });
    },
  });

  fetchSunTimes(UK_CENTER, 8)
    .then((sunTimes) => {
      const stops = buildSunGradientStops(sunTimes, timeSteps[0].date, timeSteps[timeSteps.length - 1].date);
      setTimeBarGradient(stops);
    })
    .catch((error) => {
      console.error('Sun-times gradient setup failed; time bar will use a flat background', error);
    });

  render();

  const cragLocations = crags.map((crag) => ({ lat: crag.lat, lon: crag.lon }));

  fetchWeatherForLocations(cragLocations, timeSteps)
    .then((results) => {
      if (results.length !== crags.length) {
        console.warn(
          `Weather fetch result count (${results.length}) does not match crag count (${crags.length}); ` +
            'crag-to-forecast pairing may be misaligned.'
        );
      }
      results.forEach((forecast, i) => weatherByCragId.set(crags[i].id, forecast));
      render();
    })
    .catch((error) => {
      console.error('Weather fetch failed for crags', error);
    });

  if (HEATMAP_ENABLED) {
    fetchWeatherForLocations(gridPoints, timeSteps)
      .then((results) => {
        gridWeather = results;
        render();
      })
      .catch((error) => {
        console.error('Weather fetch failed for grid', error);
      });
  }
}

function showErrorBanner(message) {
  const banner = document.getElementById('error-banner');
  banner.textContent = message;
  banner.hidden = false;
}

main();
