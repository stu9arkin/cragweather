const DAY_NAMES = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];

export function buildTimeBarTicks(timeSteps) {
  const lastIndex = timeSteps.length - 1;
  return timeSteps.map((step) => {
    const hours = step.date.getUTCHours();
    const isMajor = hours % 6 === 0;
    const isMidnight = hours === 0;
    return {
      index: step.index,
      offsetPercent: lastIndex === 0 ? 0 : (step.index / lastIndex) * 100,
      major: isMajor,
      label: isMajor ? (isMidnight ? DAY_NAMES[step.date.getUTCDay()] : formatHourLabel(hours)) : null,
    };
  });
}

function formatHourLabel(hours) {
  return `${String(hours).padStart(2, '0')}:00`;
}
