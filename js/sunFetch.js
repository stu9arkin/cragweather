const OPEN_METEO_URL = 'https://api.open-meteo.com/v1/forecast';
const REQUEST_TIMEOUT_MS = 30_000;

export function buildSunTimesUrl(point, days) {
  const params = new URLSearchParams({
    latitude: String(point.lat),
    longitude: String(point.lon),
    daily: 'sunrise,sunset',
    forecast_days: String(days),
    timezone: 'UTC',
  });
  return `${OPEN_METEO_URL}?${params.toString()}`;
}

export async function fetchSunTimes(point, days, { fetchImpl = fetch } = {}) {
  try {
    const url = buildSunTimesUrl(point, days);
    const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
    if (!response.ok) {
      throw new Error(`Open-Meteo API returned ${response.status}`);
    }
    const json = await response.json();
    const sunrises = json.daily?.sunrise ?? [];
    const sunsets = json.daily?.sunset ?? [];
    if (sunrises.length === 0 || sunrises.length !== sunsets.length) {
      throw new Error('Open-Meteo sun-times response missing daily sunrise/sunset arrays');
    }
    return sunrises.map((sunrise, i) => ({
      sunrise: new Date(`${sunrise}Z`),
      sunset: new Date(`${sunsets[i]}Z`),
    }));
  } catch (error) {
    console.error('Sun-times fetch failed; time bar will use a flat background', error);
    return [];
  }
}
