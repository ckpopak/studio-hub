# studio-hub — Café QuietLY

Public site for **Café QuietLY 靜**: vinyl-sleeve episode pages, liner-note lyrics, and Atmosphere listening.

Live URL: https://studio-hub-887652679963.asia-east1.run.app/

## Local

```bash
git clone https://github.com/ckpopak/studio-hub.git
cd studio-hub
./scripts/serve-local.sh
```

Open http://127.0.0.1:8765/

- Hub → QuietLY: http://127.0.0.1:8765/channels/quietly/
- Atmosphere: http://127.0.0.1:8765/channels/quietly/atmosphere.html

**Production-like (Docker / same as Cloud Run):**

```bash
docker compose up --build
```

Then http://127.0.0.1:8080/

## Layout

```text
/                              studio hub (QuietLY only)
/channels/quietly/             vinyl shelf + Atmosphere
/channels/quietly/worlds/      episode sleeves (lyrics + turntable)
/about.html                    studio about (QuietLY)
/atmosphere.html               redirect → QuietLY Atmosphere
```

Café Siam source remains under `channels/siam/` for a later separate layout; it is **not** linked from the hub and is **not** deployed in the Cloud Run image.

## QuietLY lyrics

Source of truth: `quietly-ch-jazz-production` prompts (`songs/prompts/…`).

```bash
N20DLE=/path/to/quietly-ch-jazz-production \
  python channels/quietly/scripts/audit-quietly-lyrics.py
N20DLE=/path/to/quietly-ch-jazz-production \
  python channels/quietly/scripts/audit-quietly-lyrics.py --write
python channels/quietly/scripts/generate-world-pages.py
```

## Deploy (Cloud Run)

Project: `silentricenation` · region: `asia-east1` · service: `studio-hub`

```bash
gcloud config set project silentricenation
gcloud run deploy studio-hub --source . --region=asia-east1 --platform=managed --allow-unauthenticated --port=8080 --project=silentricenation
```

Or:

```bash
gcloud builds submit --config=infra/cloudrun/cloudbuild.yaml --project=silentricenation
```
