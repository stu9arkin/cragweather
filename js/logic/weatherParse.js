// js/logic/weatherParse.js
export function parseLocationForecast(apiResult, timeSteps) {
  const hourlyTimes = apiResult.hourly?.time ?? [];
  const hourlyTemp = apiResult.hourly?.temperature_2m ?? [];
  const hourlyRain = apiResult.hourly?.precipitation ?? [];
  const indexByTime = new Map(hourlyTimes.map((t, i) => [t, i]));

  const temperature = [];
  const rainfall = [];
  for (const step of timeSteps) {
    const idx = indexByTime.get(step.isoHour);
    temperature.push(idx === undefined ? null : hourlyTemp[idx]);
    rainfall.push(idx === undefined ? null : hourlyRain[idx]);
  }

  const dailyTimes = apiResult.daily?.time ?? [];
  const daily = dailyTimes.map((date, i) => ({
    date,
    tempMax: apiResult.daily.temperature_2m_max[i],
    tempMin: apiResult.daily.temperature_2m_min[i],
    precipSum: apiResult.daily.precipitation_sum[i],
    weathercode: apiResult.daily.weathercode[i],
  }));

  return { hourly: { temperature, rainfall }, daily };
}
