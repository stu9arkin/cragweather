// js/weatherFetch.js
import { chunk, buildOpenMeteoUrl } from './logic/batching.js';
import { parseLocationForecast } from './logic/weatherParse.js';

const DEFAULT_BATCH_SIZE = 100;
const MAX_ATTEMPTS = 3;
const DEFAULT_RETRY_BACKOFF_MS = 2000;
const REQUEST_TIMEOUT_MS = 30_000;

function isRetryableStatus(status) {
  return status === 429 || status >= 500;
}

async function fetchBatchOnce(url, fetchImpl) {
  const response = await fetchImpl(url, { signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS) });
  if (!response.ok) {
    const error = new Error(`Open-Meteo API returned ${response.status}`);
    error.status = response.status;
    throw error;
  }
  const json = await response.json();
  if (!Array.isArray(json)) {
    const error = new Error('Open-Meteo API response was not an array');
    error.nonRetryable = true;
    throw error;
  }
  return json;
}

async function fetchBatchWithRetry(locations, { fetchImpl, retryBackoffMs }) {
  const url = buildOpenMeteoUrl(locations);
  let lastError;
  for (let attempt = 1; attempt <= MAX_ATTEMPTS; attempt++) {
    try {
      return await fetchBatchOnce(url, fetchImpl);
    } catch (error) {
      lastError = error;
      const retryable = !error.nonRetryable && (error.status === undefined || isRetryableStatus(error.status));
      if (!retryable || attempt === MAX_ATTEMPTS) throw error;
      await sleep(retryBackoffMs);
    }
  }
  throw lastError;
}

function sleep(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

export async function fetchWeatherForLocations(locations, timeSteps, {
  fetchImpl = fetch,
  batchSize = DEFAULT_BATCH_SIZE,
  retryBackoffMs = DEFAULT_RETRY_BACKOFF_MS,
} = {}) {
  const batches = chunk(locations, batchSize);
  const results = [];
  for (const batch of batches) {
    try {
      const json = await fetchBatchWithRetry(batch, { fetchImpl, retryBackoffMs });
      results.push(...json.map((result) => parseLocationForecast(result, timeSteps)));
    } catch (error) {
      console.error('Weather batch fetch failed; affected locations will have no forecast', error);
      results.push(...batch.map(() => null));
    }
  }
  return results;
}
