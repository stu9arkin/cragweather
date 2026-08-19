// js/app.js
import { loadCrags } from './cragData.js';
import { fetchWeatherForLocations } from './weatherFetch.js';
import { buildGridPoints } from './logic/grid.js';
import { createMapView, updateMarkerColors, focusCrag, setMapTheme } from './mapView.js';
import { createHeatmapView, updateHeatmapColors, setHeatmapVisible } from './heatmapView.js';
import { initControls, setTimeBarGradient, setThemeToggleState } from './controls.js';
import { renderLegend } from './legendView.js';
import { showDetailPanel, initDetailPanel } from './detailPanel.js';
import { initSearch } from './searchView.js';
import { fetchSunTimes } from './sunFetch.js';
import { buildSunGradientStops } from './logic/sunGradient.js';
import { resolveInitialTheme, toggleTheme } from './logic/theme.js';
import { MAPBOX_ACCESS_TOKEN } from './config.js';

const THEME_STORAGE_KEY = 'cragweather-theme';

const UK_BBOX = { south: 49.8, west: -8.6, north: 60.9, east: 1.8 };
const UK_CENTER = { lat: (UK_BBOX.south + UK_BBOX.north) / 2, lon: (UK_BBOX.west + UK_BBOX.east) / 2 };
const GRID_STEP_DEG = 0.5;
// Flip to true and restore the Style dropdown in index.html to re-enable heatmap mode.
// Heatmap mode was NOT migrated when the map moved from Leaflet to Mapbox GL JS
// (see docs/superpowers/specs/2026-08-19-leaflet-to-mapbox-migration-design.md) --
// js/heatmapView.js still calls the Leaflet API (L.imageOverlay, overlay.setUrl,
// map.addLayer/removeLayer) directly, which will throw once Leaflet is removed from
// index.html. Porting it to Mapbox's image source + raster layer is tracked as a
// separate follow-up issue; do not flip this flag until that lands.
const HEATMAP_ENABLED = false;
// Flip to true to re-enable the sunrise/sunset gradient behind the time bar
// (disabled for now — the current look needs more design work).
const SUN_GRADIENT_ENABLED = false;

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

  const initialTheme = resolveInitialTheme({
    stored: localStorage.getItem(THEME_STORAGE_KEY),
    prefersDark: window.matchMedia('(prefers-color-scheme: dark)').matches,
  });
  const state = { variable: 'temperature', mode: 'markers', timeIndex: 0, theme: initialTheme };
  const weatherByCragId = new Map();
  let gridWeather = [];

  const mapView = await createMapView('map', crags, state.theme, MAPBOX_ACCESS_TOKEN);
  const gridPoints = HEATMAP_ENABLED ? buildGridPoints(UK_BBOX, GRID_STEP_DEG) : [];
  const heatmapView = HEATMAP_ENABLED ? createHeatmapView(gridPoints, UK_BBOX) : null;

  mapView.on('crag:selected', ({ crag }) => {
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
    onThemeToggle: () => {
      state.theme = toggleTheme(state.theme);
      document.documentElement.dataset.theme = state.theme;
      localStorage.setItem(THEME_STORAGE_KEY, state.theme);
      setThemeToggleState(state.theme);
      setMapTheme(mapView, state.theme);
    },
    initialTheme: state.theme,
  });

  if (SUN_GRADIENT_ENABLED) {
    fetchSunTimes(UK_CENTER, 8)
      .then((sunTimes) => {
        const stops = buildSunGradientStops(sunTimes, timeSteps[0].date, timeSteps[timeSteps.length - 1].date);
        setTimeBarGradient(stops);
      })
      .catch((error) => {
        console.error('Sun-times gradient setup failed; time bar will use a flat background', error);
      });
  }

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
