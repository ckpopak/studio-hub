# GitHub Actions → Cloud Run

Deploy workflow: [`.github/workflows/deploy.yml`](../.github/workflows/deploy.yml)

## Secret

1. Local deployer key (gitignored): `.secrets/finsheet-deployer.json`  
   (created for `finsheet-deployer@silentricenation.iam.gserviceaccount.com`)
2. In GitHub repo **ckpopak/ricenation** → Settings → Secrets and variables → Actions:
   - Name: `GCP_SA_KEY`
   - Value: full contents of that JSON file
3. Push to `main` (or run **Deploy Cloud Run** via workflow_dispatch)

Do not commit the key file.
