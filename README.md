# ricenation

Static studio hub for channel side products.

## Local

```bash
python -m http.server 8765 --bind 127.0.0.1 --directory .
```

- Studio hub: http://127.0.0.1:8765/
- QuietLY atlas: http://127.0.0.1:8765/channels/quietly/
- QuietLY Atmosphere: http://127.0.0.1:8765/channels/quietly/atmosphere.html
- Café Siam JP×TH Atmosphere: http://127.0.0.1:8765/channels/siam/jpth/
- Café Siam JP×TH atlas: http://127.0.0.1:8765/channels/siam/jpth/songs.html

## Layout

```text
/                              studio hub (QuietLY listed; other slots reserved/empty)
/channels/quietly/             QuietLY field notes + Atmosphere
/channels/siam/jpth/           Café Siam Japanese × Thai listening atlas
/channels/{other}/             future channel side products
/atmosphere.html               redirect → /channels/quietly/atmosphere.html
/about.html                    redirect → /channels/quietly/about.html
```

Café Siam song data is derived from the cafesiam repo catalog (`data/songs_catalog.json`). Rebuild with:

```bash
python channels/siam/jpth/scripts/build-songs-data.py
```

Then fill missing sheets + Thai romanization from the local n20dle thjp catalog:

```bash
/path/to/n20dle/.venv/bin/python channels/siam/jpth/scripts/enrich-songs-lyrics.py
```

## Deploy (Cloud Run)

Project: `silentricenation` · region: `asia-east1` · service: `ricenation`

```bash
# one-time: create Artifact Registry repo
gcloud artifacts repositories create ricenation \
  --repository-format=docker \
  --location=asia-east1 \
  --project=silentricenation

# build + deploy from this directory
gcloud builds submit --config=infra/cloudrun/cloudbuild.yaml --project=silentricenation
```

Or:

```bash
gcloud run deploy ricenation --source . --region=asia-east1 --allow-unauthenticated --project=silentricenation
```
