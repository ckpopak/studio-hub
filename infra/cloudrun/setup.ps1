# Idempotent GCP bootstrap for FinSheet Cloud Run (silentricenation).
$ErrorActionPreference = "Continue"
$PROJECT_ID = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "silentricenation" }
$REGION = if ($env:REGION) { $env:REGION } else { "asia-east1" }
$REPO = if ($env:REPO) { $env:REPO } else { "finsheet" }
$RUNTIME_SA = "finsheet-reader@${PROJECT_ID}.iam.gserviceaccount.com"
$DEPLOYER_SA = "finsheet-deployer@${PROJECT_ID}.iam.gserviceaccount.com"

gcloud config set project $PROJECT_ID

$billing = gcloud billing projects describe $PROJECT_ID --format="value(billingEnabled)"
if ($billing -ne "True") {
  throw "Billing is not enabled on $PROJECT_ID. Open https://console.cloud.google.com/billing?project=$PROJECT_ID and reactivate billing, then re-run."
}

gcloud services enable `
  run.googleapis.com `
  artifactregistry.googleapis.com `
  secretmanager.googleapis.com `
  cloudbuild.googleapis.com `
  iam.googleapis.com `
  iamcredentials.googleapis.com `
  sheets.googleapis.com `
  drive.googleapis.com

$arCheck = cmd /c "gcloud artifacts repositories describe $REPO --location=$REGION 1>nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  gcloud artifacts repositories create $REPO `
    --repository-format=docker `
    --location=$REGION `
    --description="FinSheet container images"
  Write-Host "Created Artifact Registry repo $REPO"
} else {
  Write-Host "Artifact Registry repo $REPO already exists"
}

$saCheck = cmd /c "gcloud iam service-accounts describe $DEPLOYER_SA 1>nul 2>nul"
if ($LASTEXITCODE -ne 0) {
  gcloud iam service-accounts create finsheet-deployer --display-name="FinSheet Deployer"
  Write-Host "Created deployer SA"
} else {
  Write-Host "Deployer SA already exists"
}

foreach ($role in @(
    "roles/run.admin",
    "roles/artifactregistry.writer",
    "roles/iam.serviceAccountUser",
    "roles/secretmanager.secretAccessor",
    "roles/cloudbuild.builds.editor",
    "roles/storage.admin"
  )) {
  gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$DEPLOYER_SA" `
    --role=$role `
    --condition=None `
    --quiet 2>$null | Out-Null
}

gcloud projects add-iam-policy-binding $PROJECT_ID `
  --member="serviceAccount:$RUNTIME_SA" `
  --role="roles/secretmanager.secretAccessor" `
  --condition=None `
  --quiet 2>$null | Out-Null

$projectNumber = gcloud projects describe $PROJECT_ID --format="value(projectNumber)"
$cbSa = "$projectNumber@cloudbuild.gserviceaccount.com"
foreach ($role in @("roles/run.admin", "roles/iam.serviceAccountUser", "roles/artifactregistry.writer", "roles/secretmanager.secretAccessor")) {
  gcloud projects add-iam-policy-binding $PROJECT_ID `
    --member="serviceAccount:$cbSa" `
    --role=$role `
    --condition=None `
    --quiet 2>$null | Out-Null
}

function Ensure-Secret([string]$name, [string]$value) {
  $exists = cmd /c "gcloud secrets describe $name 1>nul 2>nul"
  if ($LASTEXITCODE -ne 0) {
    $value | gcloud secrets create $name --data-file=-
    Write-Host "Created secret $name"
  } else {
    $value | gcloud secrets versions add $name --data-file=-
    Write-Host "Added secret version $name"
  }
}

$rng = [System.Security.Cryptography.RandomNumberGenerator]::Create()
$bytes = New-Object byte[] 32
$rng.GetBytes($bytes)
$authSecret = if ($env:AUTH_SECRET) { $env:AUTH_SECRET } else { [Convert]::ToBase64String($bytes) }
Ensure-Secret "finsheet-auth-secret" $authSecret

$clientId = if ($env:GOOGLE_CLIENT_ID) { $env:GOOGLE_CLIENT_ID } else { "PENDING_OAUTH_CLIENT_ID" }
$clientSecret = if ($env:GOOGLE_CLIENT_SECRET) { $env:GOOGLE_CLIENT_SECRET } else { "PENDING_OAUTH_CLIENT_SECRET" }
$nextAuthUrl = if ($env:NEXTAUTH_URL) { $env:NEXTAUTH_URL } else { "https://placeholder.invalid" }
Ensure-Secret "finsheet-google-client-id" $clientId
Ensure-Secret "finsheet-google-client-secret" $clientSecret
Ensure-Secret "finsheet-nextauth-url" $nextAuthUrl

Write-Host "Bootstrap complete."
Write-Host "Runtime SA: $RUNTIME_SA"
Write-Host "Deployer SA: $DEPLOYER_SA"
