// js/controls.js
import { getTimeSteps } from './logic/time.js';

export function initControls({ onVariableChange, onModeChange, onTimeChange }) {
  const timeSteps = getTimeSteps();
  const scrollbar = document.getElementById('time-scrollbar');
  const timeLabel = document.getElementById('time-label');
  const variableToggle = document.getElementById('variable-toggle');
  const modeToggle = document.getElementById('mode-toggle');

  scrollbar.max = String(timeSteps.length - 1);
  scrollbar.value = '0';
  timeLabel.textContent = timeSteps[0].label;

  scrollbar.addEventListener('input', () => {
    const index = Number(scrollbar.value);
    timeLabel.textContent = timeSteps[index].label;
    onTimeChange(index);
  });

  variableToggle.addEventListener('change', () => {
    onVariableChange(variableToggle.value);
  });

  if (modeToggle) {
    modeToggle.addEventListener('change', () => {
      onModeChange(modeToggle.value);
    });
  }

  return { timeSteps };
}
