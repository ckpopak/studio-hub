# After creating/rotating the OAuth Web client:
#   $env:GOOGLE_CLIENT_ID="..."
#   $env:GOOGLE_CLIENT_SECRET="..."
#   $env:NEXTAUTH_URL="https://finsheet-887652679963.asia-east1.run.app"
#   .\infra\cloudrun\update-oauth-secrets.ps1

$ErrorActionPreference = "Stop"
$PROJECT_ID = if ($env:PROJECT_ID) { $env:PROJECT_ID } else { "silentricenation" }
$REGION = if ($env:REGION) { $env:REGION } else { "asia-east1" }
$SERVICE = if ($env:SERVICE) { $env:SERVICE } else { "finsheet" }

if (-not $env:GOOGLE_CLIENT_ID -or -not $env:GOOGLE_CLIENT_SECRET -or -not $env:NEXTAUTH_URL) {
  throw "Set GOOGLE_CLIENT_ID, GOOGLE_CLIENT_SECRET, and NEXTAUTH_URL env vars first."
}

gcloud config set project $PROJECT_ID | Out-Null

function Add-SecretFile([string]$name, [string]$value) {
  $tmp = New-TemporaryFile
  try {
    [System.IO.File]::WriteAllText($tmp.FullName, $value)
    gcloud secrets versions add $name --data-file="$($tmp.FullName)" | Out-Null
  } finally {
    Remove-Item $tmp.FullName -Force -ErrorAction SilentlyContinue
  }
}

Add-SecretFile "finsheet-google-client-id" $env:GOOGLE_CLIENT_ID.Trim()
Add-SecretFile "finsheet-google-client-secret" $env:GOOGLE_CLIENT_SECRET.Trim()
Add-SecretFile "finsheet-nextauth-url" $env:NEXTAUTH_URL.Trim()

gcloud run services update $SERVICE `
  --region=$REGION `
  --update-secrets="^|^AUTH_SECRET=finsheet-auth-secret:latest|NEXTAUTH_SECRET=finsheet-auth-secret:latest|GOOGLE_CLIENT_ID=finsheet-google-client-id:latest|GOOGLE_CLIENT_SECRET=finsheet-google-client-secret:latest|NEXTAUTH_URL=finsheet-nextauth-url:latest"

Write-Host "Secrets updated and Cloud Run service refreshed."
Write-Host "Callback URL: $($env:NEXTAUTH_URL.TrimEnd('/'))/api/auth/callback/google"
