# cragweather

**🔗 Live demo: https://stu9arkin.github.io/cragweather/**

![CragWeather screenshot](docs/screenshot.png)

A weather visualisation website for UK outdoor climbing crags. It plots every
known crag on a map of the UK, colours each marker by forecast temperature or
rainfall at a chosen point in the next 7 days, and lets you search for a crag
by name, see its details in a side panel (rock type, climbing styles, access,
a 7-day forecast, and a link to search for it on UKC), and jump straight to it
on the map.

## How it works

- **Crag data** (`data/crags.json`) is generated ahead of time from
  OpenStreetMap via the pipeline described below, and committed to the repo —
  the site itself never talks to Overpass.
- **Weather data** is fetched client-side, on page load, from the
  [Open-Meteo](https://open-meteo.com/) API (`js/weatherFetch.js`), in batches
  of up to 100 locations at a time, with retries on rate-limiting/server
  errors.
- **The map** (`js/mapView.js`, using [Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/)
  and client-side clustering via [Supercluster](https://github.com/mapbox/supercluster))
  renders one marker per crag, coloured by the selected weather variable
  (temperature or rainfall) at the selected time step. The time scrollbar
  covers the next 7 days in 3-hour steps.
- **Search** (`js/searchView.js`, `js/logic/cragSearch.js`) is a fuzzy-matching
  combobox over the crag list; selecting a result pans/zooms the map to it.
- **The detail panel** (`js/detailPanel.js`) opens when a crag marker is
  clicked, showing its metadata, a 7-day forecast, and a "Search on UKC" link
  built from the crag name.
- **The layout** is a fixed full-width top bar (search and variable/mode
  controls) and bottom bar (the time scrollbar) around the map.
- A sunrise/sunset gradient behind the time bar (`js/sunFetch.js` fetches real
  sunrise/sunset times from Open-Meteo for a fixed UK reference point, used to
  shade daylight and night hours along the track) is implemented but currently
  disabled behind a feature flag (`SUN_GRADIENT_ENABLED` in `js/app.js`)
  pending more design work.
- A grid-based heatmap mode (`js/heatmapView.js`) is implemented but currently
  disabled behind a feature flag (`HEATMAP_ENABLED` in `js/app.js`) and has no
  UI control wired up in `index.html`.

## Crag data pipeline

`scripts/fetch-crags.mjs` builds `data/crags.json`, the dataset of UK outdoor
climbing crags used by the site. It queries the [Overpass API](https://overpass-api.de/)
(an OpenStreetMap query service) in two parts: climbing-tagged nodes/ways, and
named `bare_rock`/`cliff` features that lack an explicit climbing tag but sit
near a verified climbing feature (a geographic "seed and cluster" filter
recovers real crags OSM doesn't tag consistently, without pulling in unrelated
named rocks). It then filters out indoor venues, gear shops, and other
non-crag facilities, deduplicates near-identical entries, and attaches a UKC
search link to each crag. Run it with:

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

Note: `ukcSearchUrl` links directly into UKC's own logbook search
(`ukclimbing.com/logbook/search/`), built from the crag name in
`scripts/lib/ukc-link.mjs`.

Run `npm test` to run the test suite (158 tests, dependency-free, uses
Node's built-in test runner).

### Manual overrides

`scripts/crag-overrides.json` is a small, hand-maintained file for edge cases
the automated filters can't resolve correctly on their own:

```json
{
  "exclude": ["node/1234567"],
  "include": [
    { "id": "way/7654321", "name": "Some Crag", "lat": 53.1, "lon": -1.2 }
  ]
}
```

- `exclude`: an array of crag `id` strings (the same `"type/id"` format used
  in `data/crags.json`, e.g. `"node/1234567"`) to drop from the dataset even
  if they'd otherwise pass every filter.
- `include`: an array of literal crag objects (same shape as a `data/crags.json`
  entry — `id`, `name`, `lat`, `lon`, and optionally `rock`, `climbingStyles`,
  `access`, `description`) to add to the dataset regardless of what the
  Overpass query and filters produced. Any `ukcSearchUrl` you supply is
  ignored and regenerated from `name`.

Both lists start empty and should stay small — this is a safety valve for
rare cases, not a primary data source.

## Frontend

The site (`index.html`, `css/`, `js/`) is a static, build-step-free vanilla
JS app using ES modules, so it **must be served over HTTP** to work — e.g.
`npx serve .` or any other static file server. Opening `index.html` directly
via `file://` will not work: both `import`/`export` ES modules and the
`fetch('data/crags.json')` call are blocked under the `file://` protocol.

[Mapbox GL JS](https://docs.mapbox.com/mapbox-gl-js/guides/) is loaded
directly from the Mapbox CDN in `index.html`; `supercluster` is imported
from a CDN ES module URL inside `js/mapView.js`. No `npm install` is
required to run the frontend itself.

### Mapbox setup

The map needs a Mapbox access token. `js/config.js` is gitignored (not
committed) — copy `js/config.example.js` to `js/config.js` and fill in
your own token:

1. Log into <https://console.mapbox.com/> (create a free account if you
   don't have one).
2. Go to **Tokens** in the account menu → **Create a token**.
3. Name it something identifiable, e.g. `cragweather-web`.
4. Leave the default public scopes (`styles:read`, `fonts:read`,
   `styles:tiles`) — no secret/write scopes are needed.
5. Under **URL restrictions**, add the URL(s) this site is served from
   (e.g. your GitHub Pages URL) plus `http://localhost:*` and
   `http://127.0.0.1:*` for local development.
6. Create the token, copy `js/config.example.js` to `js/config.js`, and
   paste the `pk.` value in place of the placeholder.
7. The free tier covers 50,000 map loads/month.

Production (GitHub Pages) gets its token from a `MAPBOX_ACCESS_TOKEN`
repository secret (Settings → Secrets and variables → Actions), written
into `js/config.js` at deploy time by
`.github/workflows/deploy-site.yml` — see that workflow for details.

`npm test` runs the full test suite (158 tests): pure logic modules and
modules with injectable `fetch` implementations are unit-tested; DOM-rendering
modules (map/marker/heatmap/panel rendering) are verified manually in a
browser rather than unit-tested.

To deploy, GitHub Pages must be enabled once, manually, on the repo: Settings
→ Pages → Build and deployment → Source → "GitHub Actions". After that,
`.github/workflows/deploy-site.yml` deploys automatically on pushes to `main`
(including automated crag-data refreshes).
