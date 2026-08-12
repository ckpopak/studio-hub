# FinSheet Google OAuth setup (Cloud Run)

**Production URL:** https://finsheet-887652679963.asia-east1.run.app  
**Callback:** https://finsheet-887652679963.asia-east1.run.app/api/auth/callback/google

Sheets data is read by the Cloud Run runtime SA  
`finsheet-reader@silentricenation.iam.gserviceaccount.com`.  
OAuth is only for signing humans into the web UI (email allow-list).

Secrets in Secret Manager (already wired to Cloud Run):

- `finsheet-auth-secret` / used as `AUTH_SECRET` + `NEXTAUTH_SECRET`
- `finsheet-google-client-id`
- `finsheet-google-client-secret`
- `finsheet-nextauth-url`

## Consent screen (Testing)

1. [OAuth consent screen](https://console.cloud.google.com/apis/credentials/consent?project=silentricenation)
2. External app **FinSheet**; scopes `openid`, email, profile
3. Test users: `ken.kp.chan@gmail.com`, `ckpopak@gmail.com`

## Web client checklist

[Credentials](https://console.cloud.google.com/apis/credentials?project=silentricenation) → Web application:

| Field | Value |
|-------|--------|
| Authorized JavaScript origins | `https://finsheet-887652679963.asia-east1.run.app` |
| Authorized redirect URIs | `https://finsheet-887652679963.asia-east1.run.app/api/auth/callback/google` |

Optional alias origin/redirect (same service):  
`https://finsheet-z4227lzhdq-de.a.run.app` (+ `/api/auth/callback/google`)

## Rotate / update secrets

```powershell
$env:GOOGLE_CLIENT_ID="....apps.googleusercontent.com"
$env:GOOGLE_CLIENT_SECRET="...."
$env:NEXTAUTH_URL="https://finsheet-887652679963.asia-east1.run.app"
# Prefer writing via files inside update script if piping fails in PowerShell
.\infra\cloudrun\update-oauth-secrets.ps1
```
