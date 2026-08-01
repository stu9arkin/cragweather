// js/detailPanel.js
import { weatherCodeToIcon } from './logic/weatherCodeIcon.js';

const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function initDetailPanel() {
  document.getElementById('detail-panel-close').addEventListener('click', hideDetailPanel);
}

export function showDetailPanel(crag, forecast) {
  const panel = document.getElementById('detail-panel');
  const content = document.getElementById('detail-panel-content');

  const styleText = crag.climbingStyles ? crag.climbingStyles.join(', ') : null;

  content.innerHTML = `
    <h2>${escapeHtml(crag.name)}</h2>
    ${crag.rock ? `<p><strong>Rock:</strong> ${escapeHtml(crag.rock)}</p>` : ''}
    ${styleText ? `<p><strong>Style:</strong> ${escapeHtml(styleText)}</p>` : ''}
    ${crag.access ? `<p><strong>Access:</strong> ${escapeHtml(crag.access)}</p>` : ''}
    ${crag.description ? `<p>${escapeHtml(crag.description)}</p>` : ''}
    <h3>7-day forecast</h3>
    <div id="detail-forecast">${renderForecast(forecast)}</div>
    <p><a href="${escapeHtml(crag.ukcSearchUrl)}" target="_blank" rel="noopener noreferrer">Search on UKC</a></p>
  `;

  panel.hidden = false;
}

export function hideDetailPanel() {
  document.getElementById('detail-panel').hidden = true;
}

function renderForecast(forecast) {
  if (!forecast || !forecast.daily || forecast.daily.length === 0) {
    return '<p>Forecast unavailable.</p>';
  }
  return forecast.daily
    .map((day) => {
      const { icon, label } = weatherCodeToIcon(day.weathercode);
      return `
        <div class="forecast-day">
          <span>${formatDayName(day.date)}</span>
          <span title="${escapeHtml(label)}">${icon}</span>
          <span>${Math.round(day.tempMax)}° / ${Math.round(day.tempMin)}°</span>
        </div>
      `;
    })
    .join('');
}

function formatDayName(isoDate) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  return DAY_NAMES[date.getUTCDay()];
}

function escapeHtml(str) {
  const div = document.createElement('div');
  div.textContent = str;
  return div.innerHTML;
}
