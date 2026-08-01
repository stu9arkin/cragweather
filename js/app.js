// js/app.js
import { loadCrags } from './cragData.js';
import { fetchWeatherForLocations } from './weatherFetch.js';
import { buildGridPoints } from './logic/grid.js';
import { createMapView, updateMarkerColors } from './mapView.js';
import { createHeatmapView, updateHeatmapColors, setHeatmapVisible } from './heatmapView.js';
import { initControls } from './controls.js';
import { renderLegend } from './legendView.js';
import { showDetailPanel, initDetailPanel } from './detailPanel.js';

const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };

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
  const gridPoints = buildGridPoints(UK_BBOX);
  const heatmapView = createHeatmapView(mapView.map, gridPoints);

  mapView.map.on('crag:selected', ({ crag }) => {
    showDetailPanel(crag, weatherByCragId.get(crag.id));
  });

  function render() {
    updateMarkerColors(mapView, weatherByCragId, state.variable, state.timeIndex);
    if (state.mode === 'heatmap') {
      updateHeatmapColors(heatmapView, gridWeather, state.variable, state.timeIndex);
    }
  }

  renderLegend(document.getElementById('legend'), state.variable);

  const { timeSteps } = initControls({
    onVariableChange: (variable) => {
      state.variable = variable;
      renderLegend(document.getElementById('legend'), state.variable);
      render();
    },
    onModeChange: (mode) => {
      state.mode = mode;
      setHeatmapVisible(heatmapView, mapView.map, mode === 'heatmap');
      render();
    },
    onTimeChange: (index) => {
      state.timeIndex = index;
      render();
    },
  });

  render();

  const cragLocations = crags.map((crag) => ({ lat: crag.lat, lon: crag.lon }));

  fetchWeatherForLocations(cragLocations, timeSteps)
    .then((results) => {
      results.forEach((forecast, i) => weatherByCragId.set(crags[i].id, forecast));
      render();
    })
    .catch((error) => {
      console.error('Weather fetch failed for crags', error);
    });

  fetchWeatherForLocations(gridPoints, timeSteps)
    .then((results) => {
      gridWeather = results;
      render();
    })
    .catch((error) => {
      console.error('Weather fetch failed for grid', error);
    });
}

function showErrorBanner(message) {
  const banner = document.getElementById('error-banner');
  banner.textContent = message;
  banner.hidden = false;
}

main();
