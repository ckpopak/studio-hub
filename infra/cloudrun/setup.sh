#!/usr/bin/env bash
# Idempotent GCP bootstrap for FinSheet Cloud Run (project silentricenation).
set -euo pipefail

PROJECT_ID="${PROJECT_ID:-silentricenation}"
REGION="${REGION:-asia-east1}"
REPO="${REPO:-finsheet}"
RUNTIME_SA="finsheet-reader@${PROJECT_ID}.iam.gserviceaccount.com"
DEPLOYER_SA="finsheet-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project "${PROJECT_ID}"

gcloud services enable \
  run.googleapis.com \
  artifactregistry.googleapis.com \
  secretmanager.googleapis.com \
  cloudbuild.googleapis.com \
  iam.googleapis.com \
  iamcredentials.googleapis.com \
  sheets.googleapis.com \
  drive.googleapis.com

if ! gcloud artifacts repositories describe "${REPO}" --location="${REGION}" >/dev/null 2>&1; then
  gcloud artifacts repositories create "${REPO}" \
    --repository-format=docker \
    --location="${REGION}" \
    --description="FinSheet container images"
fi

# Deployer SA for GitHub Actions / Cloud Build push
if ! gcloud iam service-accounts describe "${DEPLOYER_SA}" >/dev/null 2>&1; then
  gcloud iam service-accounts create finsheet-deployer \
    --display-name="FinSheet Deployer"
fi

for ROLE in \
  roles/run.admin \
  roles/artifactregistry.writer \
  roles/iam.serviceAccountUser \
  roles/secretmanager.secretAccessor \
  roles/cloudbuild.builds.editor \
  roles/storage.admin
do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${DEPLOYER_SA}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null
done

# Runtime SA can read secrets mounted into Cloud Run
gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
  --member="serviceAccount:${RUNTIME_SA}" \
  --role="roles/secretmanager.secretAccessor" \
  --condition=None \
  --quiet >/dev/null

# Cloud Build default SA needs to deploy and act as runtime SA
PROJECT_NUMBER="$(gcloud projects describe "${PROJECT_ID}" --format='value(projectNumber)')"
CB_SA="${PROJECT_NUMBER}@cloudbuild.gserviceaccount.com"
for ROLE in roles/run.admin roles/iam.serviceAccountUser roles/artifactregistry.writer; do
  gcloud projects add-iam-policy-binding "${PROJECT_ID}" \
    --member="serviceAccount:${CB_SA}" \
    --role="${ROLE}" \
    --condition=None \
    --quiet >/dev/null
done

ensure_secret() {
  local name="$1"
  local value="$2"
  if ! gcloud secrets describe "${name}" >/dev/null 2>&1; then
    printf '%s' "${value}" | gcloud secrets create "${name}" --data-file=-
  else
    printf '%s' "${value}" | gcloud secrets versions add "${name}" --data-file=-
  fi
}

AUTH_SECRET="${AUTH_SECRET:-$(openssl rand -base64 32 2>/dev/null || powershell -Command "[Convert]::ToBase64String((1..32|%{Get-Random -Max 256}) -as [byte[]])")}"
ensure_secret finsheet-auth-secret "${AUTH_SECRET}"

# Placeholders until OAuth client is created (updated later)
ensure_secret finsheet-google-client-id "${GOOGLE_CLIENT_ID:-PENDING_OAUTH_CLIENT_ID}"
ensure_secret finsheet-google-client-secret "${GOOGLE_CLIENT_SECRET:-PENDING_OAUTH_CLIENT_SECRET}"
ensure_secret finsheet-nextauth-url "${NEXTAUTH_URL:-https://placeholder.invalid}"

echo "Bootstrap complete."
echo "Runtime SA: ${RUNTIME_SA}"
echo "Deployer SA: ${DEPLOYER_SA}"
