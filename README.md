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

Run `npm test` to run the test suite (22+ tests, dependency-free, uses
Node's built-in test runner).
