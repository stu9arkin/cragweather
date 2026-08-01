// js/logic/weatherCodeIcon.js
const CODE_MAP = {
  0: { icon: '☀️', label: 'Clear sky' },
  1: { icon: '🌤️', label: 'Mainly clear' },
  2: { icon: '⛅', label: 'Partly cloudy' },
  3: { icon: '☁️', label: 'Overcast' },
  45: { icon: '🌫️', label: 'Fog' },
  48: { icon: '🌫️', label: 'Depositing rime fog' },
  51: { icon: '🌦️', label: 'Light drizzle' },
  53: { icon: '🌦️', label: 'Moderate drizzle' },
  55: { icon: '🌧️', label: 'Dense drizzle' },
  61: { icon: '🌦️', label: 'Slight rain' },
  63: { icon: '🌧️', label: 'Moderate rain' },
  65: { icon: '🌧️', label: 'Heavy rain' },
  71: { icon: '🌨️', label: 'Slight snow' },
  73: { icon: '🌨️', label: 'Moderate snow' },
  75: { icon: '❄️', label: 'Heavy snow' },
  80: { icon: '🌦️', label: 'Slight rain showers' },
  81: { icon: '🌧️', label: 'Moderate rain showers' },
  82: { icon: '⛈️', label: 'Violent rain showers' },
  95: { icon: '⛈️', label: 'Thunderstorm' },
  96: { icon: '⛈️', label: 'Thunderstorm with hail' },
  99: { icon: '⛈️', label: 'Thunderstorm with heavy hail' },
};

const DEFAULT_ICON = { icon: '❔', label: 'Unknown' };

export function weatherCodeToIcon(code) {
  return CODE_MAP[code] ?? DEFAULT_ICON;
}
