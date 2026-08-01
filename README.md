# cragweather
A weather visualisation website specifically aimed at climbers in the UK

## Crag data pipeline

`scripts/fetch-crags.mjs` builds `data/crags.json`, the dataset of UK outdoor
climbing crags used by the site. It queries the [Overpass API](https://overpass-api.de/)
(an OpenStreetMap query service) for climbing-tagged nodes/ways within the UK
bounding box, filters out indoor venues and gear shops, deduplicates
near-identical entries, and attaches a UKC search link to each crag. Run it
with:

```sh
npm run fetch-crags
```

This requires **Node >= 22** (the project's test runner uses `node --test`
with glob positional arguments, which need Node 21+).

**`data/crags.json` is machine-generated and should not be hand-edited.** It
is refreshed automatically by a scheduled GitHub Actions workflow
(`.github/workflows/refresh-crags.yml`), which runs the test suite, fetches
fresh data, and commits the result if it changed.

Each entry in `data/crags.json` has the shape:

```jsonc
{
  "id": "node/12345",           // always present: OSM element type/id
  "name": "Stanage Edge",       // always present
  "lat": 53.3403,               // always present
  "lon": -1.6294,               // always present
  "rock": "gritstone",          // optional
  "climbingStyles": ["trad"],   // optional
  "access": "yes",              // optional
  "description": "...",         // optional
  "ukcSearchUrl": "https://..." // always present
}
```

Note: `ukcSearchUrl` is a Google `site:ukclimbing.com` search link rather than
a link into UKC's own search, because UKC's real search endpoint couldn't be
verified during design (Cloudflare blocks automated access). This is isolated
in `scripts/lib/ukc-link.mjs` if someone wants to swap it out later.

Run `npm test` to run the test suite (79 tests, dependency-free, uses
Node's built-in test runner).

## Frontend

The site (`index.html`, `css/`, `js/`) is a static, build-step-free vanilla
JS app using ES modules, so it **must be served over HTTP** to work — e.g.
`npx serve .` or any other static file server. Opening `index.html` directly
via `file://` will not work: both `import`/`export` ES modules and the
`fetch('data/crags.json')` call are blocked under the `file://` protocol.

[Leaflet 1.9.4](https://leafletjs.com/) and
[Leaflet.markercluster 1.5.3](https://github.com/Leaflet/Leaflet.markercluster)
are loaded directly from the unpkg CDN in `index.html`, so no `npm install`
is required to run the frontend itself.

`npm test` runs the full test suite (79 tests): pure logic modules and
modules with injectable `fetch` implementations are unit-tested; DOM-rendering
modules (map/marker/heatmap/panel rendering) are verified manually in a
browser rather than unit-tested.

To deploy, GitHub Pages must be enabled once, manually, on the repo: Settings
→ Pages → Build and deployment → Source → "GitHub Actions". After that,
`.github/workflows/deploy-site.yml` deploys automatically on pushes to `main`
(including automated crag-data refreshes).
