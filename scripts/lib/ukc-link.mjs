export function buildUkcSearchUrl(name) {
  return `https://www.ukclimbing.com/logbook/search/?sort=score&query=${encodeURIComponent(name)}&type=all`;
}
