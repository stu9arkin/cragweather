// js/logic/clusterAggregate.js
export function average(numbers) {
  const valid = numbers.filter((n) => n !== null && n !== undefined && !Number.isNaN(n));
  if (valid.length === 0) return null;
  return valid.reduce((sum, n) => sum + n, 0) / valid.length;
}
