# ricenation

Static studio hub for channel side products.

## Local

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory .
```

- Studio hub: http://127.0.0.1:8765/
- QuietLY atlas: http://127.0.0.1:8765/channels/quietly/
- QuietLY Atmosphere: http://127.0.0.1:8765/channels/quietly/atmosphere.html
- Café Siam family: http://127.0.0.1:8765/channels/siam/
- Café Siam JP×TH Atmosphere: http://127.0.0.1:8765/channels/siam/jpth/
- Café Siam EN×TH Atmosphere: http://127.0.0.1:8765/channels/siam/enthp/
- Café Siam TH×EN Atmosphere: http://127.0.0.1:8765/channels/siam/thenth/
- Café Siam EN×JP Atmosphere: http://127.0.0.1:8765/channels/siam/enjp/
- Café Siam 中文×TH Atmosphere: http://127.0.0.1:8765/channels/siam/thchi/

## Layout

```text
/                              studio hub (QuietLY listed; other slots reserved/empty)
/channels/quietly/             QuietLY field notes + Atmosphere
/channels/siam/                Café Siam family landing (five on-site rooms)
/channels/siam/jpth/           Japanese × Thai (@cafesiamsoftmusicthaijapanese)
/channels/siam/enthp/          English × Thai (@cafesiamsoftmusic)
/channels/siam/thenth/         Thai × English (@cafesiamsoftmusicthai)
/channels/siam/enjp/           English × Japanese (@cafesiamsoftmusicjap)
/channels/siam/thchi/          中文 × Thai (@cafesiamsoftmusicchi)
/atmosphere.html               redirect → /channels/quietly/atmosphere.html
/about.html                    redirect → /channels/quietly/about.html
```

## Café Siam data pipeline

Room definitions and n20dle series suffixes live in `channels/siam/_shared/rooms.py`, cross-checked with **lang-song-p25-production** (same suffix layout as legacy `daily20_*` catalogs).

Rebuild song catalogs from the cafesiam repo (`data/songs_catalog.json`) when available:

```bash
export CAFESIAM_CATALOG=/path/to/cafesiam/data/songs_catalog.json
python channels/siam/scripts/build-songs-data.py
python channels/siam/scripts/enrich-songs-lyrics.py
```

Or build a single room:

```bash
python channels/siam/scripts/build-songs-data.py enthp
python channels/siam/scripts/enrich-songs-lyrics.py enthp
```

YouTube flat-playlist fallback (metadata only, no lyric sheets):

```bash
python channels/siam/scripts/build-songs-data.py enthp --youtube
```

Enrichment reads local n20dle / lang-song-p25-production catalogs (`N20DLE_CATALOG`) using series globs:

- `lang-song-p25-production_*_<suffix>`
- `lang-song-p25_*_<suffix>`
- `daily20_*_<suffix>`

Regenerate static room pages from the jpth template:

```bash
python channels/siam/scripts/generate-rooms.py
```

## Deploy

Project: `silentricenation` · region: `asia-east1` · service: `studio-hub`

### GitHub Pages (no GCP credentials)

Push to `master` runs `.github/workflows/deploy-pages.yml`, which validates the
static layout and publishes the site.

1. In GitHub → **Settings → Pages**, set **Source** to **GitHub Actions** (one-time).
2. After the first successful run, the site is at  
   `https://<owner>.github.io/studio-hub/` (project site URL).

This is the recommended path when `GCP_SA_KEY` is not configured. The workflow
cannot enable Pages automatically — that single settings click is required.

### Cloud Run (production URL)

Live URL today: https://studio-hub-z4227lzhdq-de.a.run.app/

**CI:** `.github/workflows/deploy-cloudrun.yml` runs on manual dispatch, or on
push to `master` when the repository variable `ENABLE_CLOUDRUN_DEPLOY` is set
to `true` (Settings → Secrets and variables → Actions → Variables). Requires
the `GCP_SA_KEY` secret (JSON service account with Cloud Run Admin + Cloud Build
permissions). If the variable is unset, push deploys skip Cloud Run and only
GitHub Pages runs.

**Manual deploy** (after rebuilding song data locally):

```bash
gcloud auth login
gcloud config set project silentricenation

export CAFESIAM_CATALOG=/path/to/cafesiam/data/songs_catalog.json
export N20DLE_CATALOG=/path/to/lang-song-p25-production/catalog
pip install pythainlp
python channels/siam/scripts/build-songs-data.py
python channels/siam/scripts/enrich-songs-lyrics.py

gcloud run deploy studio-hub \
  --source . \
  --region=asia-east1 \
  --platform=managed \
  --allow-unauthenticated \
  --port=8080 \
  --project=silentricenation
```

Production cross-check manifest: `channels/siam/_shared/production-crosscheck.json`
