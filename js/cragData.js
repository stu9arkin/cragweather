export async function loadCrags(fetchImpl = fetch, url = 'data/crags.json') {
  const response = await fetchImpl(url);
  if (!response.ok) {
    throw new Error(`Failed to load crag data: ${response.status}`);
  }
  const crags = await response.json();
  if (!Array.isArray(crags)) {
    throw new Error('Crag data response was not an array');
  }
  return crags;
}
