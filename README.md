# ricenation

Static studio hub for channel side products.

## Resonance — listening RPG

`resonance/` is a contemplative RPG layered on the studio: choose a Listener (Mò, Lin, or Sai), enter atmospheric rooms, collect Resonances in `localStorage`, and keep a personal Listening Ledger. No combat — only attention.

Play at `/resonance/` when running locally: http://127.0.0.1:8765/resonance/

## Local (on your computer)

Clone the repo, then from the repo root:

**macOS / Linux**

```bash
git clone https://github.com/ckpopak/studio-hub.git
cd studio-hub
./scripts/serve-local.sh
```

**Windows (PowerShell)**

```powershell
git clone https://github.com/ckpopak/studio-hub.git
cd studio-hub
.\scripts\serve-local.ps1
```

**Windows (Command Prompt)**

```bat
git clone https://github.com/ckpopak/studio-hub.git
cd studio-hub
scripts\serve-local.bat
```

Requires **Python 3** installed (`python3` on macOS/Linux, `python` on Windows). Then open http://127.0.0.1:8765/

**Production-like local server** (nginx in Docker, same as Cloud Run):

```bash
docker compose up --build
```

Then open http://127.0.0.1:8080/

> **Cloud Agent note:** If an agent runs `http.server` in a remote VM, `127.0.0.1` in your browser points at your machine, not that VM. Run one of the commands above on your own computer to view the site locally.

- Studio hub: http://127.0.0.1:8765/ (Python) or http://127.0.0.1:8080/ (Docker)
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

## Deploy (Cloud Run)

Project: `silentricenation` · region: `asia-east1` · service: `studio-hub`

Live URL: https://studio-hub-887652679963.asia-east1.run.app/

Pull latest, then deploy from the repo root (not your home directory):

```bash
git pull origin master
gcloud config set project silentricenation
gcloud run deploy studio-hub --source . --region=asia-east1 --platform=managed --allow-unauthenticated --port=8080 --project=silentricenation
```

**PowerShell** (single line — do not use `\` for line breaks):

```powershell
git pull origin master
gcloud config set project silentricenation
gcloud run deploy studio-hub --source . --region=asia-east1 --platform=managed --allow-unauthenticated --port=8080 --project=silentricenation
```

Or build via Cloud Build:

```bash
gcloud builds submit --config=infra/cloudrun/cloudbuild.yaml --project=silentricenation
```

Optional — rebuild song data before deploy:

```bash
export CAFESIAM_CATALOG=/path/to/cafesiam/data/songs_catalog.json
export N20DLE_CATALOG=/path/to/lang-song-p25-production/catalog
pip install pythainlp
python channels/siam/scripts/build-songs-data.py
python channels/siam/scripts/enrich-songs-lyrics.py
```

Production cross-check manifest: `channels/siam/_shared/production-crosscheck.json`
