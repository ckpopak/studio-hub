# FinSheet (ricenation)

Personal finance web UI over your existing Google Sheets:

- **B(Y)** — yearly month × category grid (`OY(hkd)`); past months = actuals; **negative = debt / cash out**
- **B(M)** — cash diary (`_cflow`) with `BAL` / `IN` / `OUT`

Hosted on **Google Cloud Run** (`silentricenation`, region `asia-east1`).

**Production URL:** https://finsheet-887652679963.asia-east1.run.app

## Architecture

| Piece | Detail |
|-------|--------|
| App | Next.js (`apps/web`) on Cloud Run service `finsheet` |
| Sheets reader | Runtime SA `finsheet-reader@silentricenation.iam.gserviceaccount.com` (ADC) |
| Secrets | Secret Manager: `finsheet-auth-secret`, `finsheet-google-client-id`, `finsheet-google-client-secret`, `finsheet-nextauth-url` |
| Images | Artifact Registry `asia-east1-docker.pkg.dev/silentricenation/finsheet/finsheet` |
| CI/CD | [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml) on push to `main` |

## One-time GCP setup

### 1. Billing (required)

Cloud Run / Artifact Registry / Secret Manager need an **open** billing account on `silentricenation`.

1. Open [Billing](https://console.cloud.google.com/billing?project=silentricenation)
2. Reactivate / attach a billing account until `billingEnabled` is true:
   ```bash
   gcloud billing projects describe silentricenation
   ```

### 2. Bootstrap APIs, registry, IAM, secrets

```powershell
.\infra\cloudrun\setup.ps1
```

### 3. First deploy (Cloud Build — no local Docker)

```bash
gcloud builds submit --config=infra/cloudrun/cloudbuild.yaml --substitutions=SHORT_SHA=$(git rev-parse --short HEAD)
```

Note the service URL:

```bash
gcloud run services describe finsheet --region=asia-east1 --format='value(status.url)'
```

### 4. Google OAuth (sign-in)

Configured for the production URL (see [docs/oauth-setup.md](docs/oauth-setup.md)).  
Allow-listed emails: `ken.kp.chan@gmail.com`, `ckpopak@gmail.com`.

To rotate client credentials:

```powershell
$env:GOOGLE_CLIENT_ID="..."
$env:GOOGLE_CLIENT_SECRET="..."
$env:NEXTAUTH_URL="https://finsheet-887652679963.asia-east1.run.app"
.\infra\cloudrun\update-oauth-secrets.ps1
```

### 5. GitHub Actions deploy

Deployer SA key already created locally at `.secrets/finsheet-deployer.json` (gitignored).

1. In GitHub repo **Settings → Secrets and variables → Actions**, create secret `GCP_SA_KEY` with the full JSON contents of that file
2. Push to `main` (or run **Deploy Cloud Run** workflow manually) — see [`.github/workflows/deploy.yml`](.github/workflows/deploy.yml)
3. Delete or rotate the local deployer key after it is stored in GitHub

CI typecheck/build remains in [`.github/workflows/ci.yml`](.github/workflows/ci.yml).

## Repo layout

```
apps/web          Next.js UI + API
packages/sheets   B(Y)/B(M) parsers + Sheets client (ADC-first)
infra/cloudrun    setup, Cloud Build, secret helpers
docs/             sheet study + OAuth guide
```

## Local development (optional)

```bash
pnpm install
# apps/web/.env.local — see .env.example
pnpm dev
```

Sheets SA JSON under `.secrets/` is gitignored; Cloud Run does **not** use that key (ADC via runtime SA).

## Study notes

[docs/sheet-study.md](docs/sheet-study.md)
