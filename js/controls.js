// js/controls.js
import { getTimeSteps } from './logic/time.js';
import { buildTimeBarTicks } from './logic/timeBarTicks.js';
import { stopsToCssGradient } from './logic/sunGradient.js';

export function initControls({ onVariableChange, onModeChange, onTimeChange, onThemeToggle, initialTheme }) {
  const timeSteps = getTimeSteps();
  const scrollbar = document.getElementById('time-scrollbar');
  const floatingLabel = document.getElementById('time-bar-floating-label');
  const ticksContainer = document.getElementById('time-bar-ticks');
  const variableToggle = document.getElementById('variable-toggle');
  const modeToggle = document.getElementById('mode-toggle');
  const themeToggle = document.getElementById('theme-toggle');

  scrollbar.max = String(timeSteps.length - 1);
  scrollbar.value = '0';

  renderTicks(ticksContainer, timeSteps);
  updateFloatingLabel(floatingLabel, scrollbar, timeSteps);

  scrollbar.addEventListener('input', () => {
    const index = Number(scrollbar.value);
    updateFloatingLabel(floatingLabel, scrollbar, timeSteps);
    onTimeChange(index);
  });

  scrollbar.addEventListener('pointerdown', () => showFloatingLabel(floatingLabel));
  scrollbar.addEventListener('pointerup', () => hideFloatingLabel(floatingLabel));
  scrollbar.addEventListener('keydown', () => showFloatingLabel(floatingLabel));
  scrollbar.addEventListener('blur', () => hideFloatingLabel(floatingLabel));

  variableToggle.addEventListener('change', () => {
    onVariableChange(variableToggle.value);
  });

  if (modeToggle) {
    modeToggle.addEventListener('change', () => {
      onModeChange(modeToggle.value);
    });
  }

  if (themeToggle) {
    applyThemeToggleState(themeToggle, initialTheme);
    themeToggle.addEventListener('click', () => onThemeToggle());
  }

  return { timeSteps };
}

export function setTimeBarGradient(stops) {
  const scrollbar = document.getElementById('time-scrollbar');
  const css = stopsToCssGradient(stops);
  scrollbar.style.background = css ?? '';
}

export function setThemeToggleState(theme) {
  const themeToggle = document.getElementById('theme-toggle');
  if (themeToggle) applyThemeToggleState(themeToggle, theme);
}

function applyThemeToggleState(themeToggle, theme) {
  const isDark = theme === 'dark';
  themeToggle.setAttribute('aria-pressed', String(isDark));
  themeToggle.setAttribute('aria-label', isDark ? 'Switch to light mode' : 'Switch to dark mode');
  themeToggle.textContent = isDark ? '☾' : '☀';
}

function renderTicks(container, timeSteps) {
  if (!container) return;
  const ticks = buildTimeBarTicks(timeSteps);
  container.replaceChildren();
  for (const tick of ticks) {
    const mark = document.createElement('div');
    mark.className = tick.major ? 'time-bar-tick major' : 'time-bar-tick';
    mark.style.left = `${tick.offsetPercent}%`;
    container.appendChild(mark);

    if (tick.label !== null) {
      const label = document.createElement('div');
      label.className = tick.isDayLabel ? 'time-bar-tick-label day' : 'time-bar-tick-label hour';
      label.style.left = `${tick.offsetPercent}%`;
      label.textContent = tick.label;
      container.appendChild(label);
    }
  }
}

function updateFloatingLabel(floatingLabel, scrollbar, timeSteps) {
  if (!floatingLabel) return;
  const index = Number(scrollbar.value);
  floatingLabel.textContent = timeSteps[index].label;
  floatingLabel.style.left = `${(index / (timeSteps.length - 1)) * 100}%`;
}

function showFloatingLabel(floatingLabel) {
  if (floatingLabel) floatingLabel.hidden = false;
}

function hideFloatingLabel(floatingLabel) {
  if (floatingLabel) floatingLabel.hidden = true;
}
