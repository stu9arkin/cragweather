const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';

export function chunk(items, size) {
  const chunks = [];
  for (let i = 0; i < items.length; i += size) {
    chunks.push(items.slice(i, i + size));
  }
  return chunks;
}

export function buildOpenMeteoUrl(locations, { forecastDays = 8 } = {}) {
  const params = new URLSearchParams({
    latitude: locations.map((loc) => loc.lat).join(','),
    longitude: locations.map((loc) => loc.lon).join(','),
    hourly: 'temperature_2m,precipitation',
    daily: 'temperature_2m_max,temperature_2m_min,precipitation_sum,weathercode',
    forecast_days: String(forecastDays),
    timezone: 'UTC',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}
