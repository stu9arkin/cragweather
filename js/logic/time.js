const STEP_HOURS = 3;
const STEP_COUNT = 56; // 7 days * 8 steps/day
const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function getTimeSteps(now = new Date()) {
  const start = new Date(now);
  start.setUTCMinutes(0, 0, 0);
  start.setUTCHours(Math.floor(start.getUTCHours() / STEP_HOURS) * STEP_HOURS);

  const steps = [];
  for (let i = 0; i < STEP_COUNT; i++) {
    const date = new Date(start.getTime() + i * STEP_HOURS * 60 * 60 * 1000);
    steps.push({
      index: i,
      date,
      isoHour: formatIsoHour(date),
      label: formatLabel(date),
    });
  }
  return steps;
}

function formatIsoHour(date) {
  return date.toISOString().slice(0, 13) + ':00';
}

function formatLabel(date) {
  const day = DAY_NAMES[date.getUTCDay()];
  const hh = String(date.getUTCHours()).padStart(2, '0');
  return `${day} ${hh}:00`;
}
