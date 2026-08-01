export function buildUkcSearchUrl(name) {
  const query = `site:ukclimbing.com ${name} crag`;
  return `https://www.google.com/search?q=${encodeURIComponent(query)}`;
}
