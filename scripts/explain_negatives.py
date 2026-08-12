"""List B(Y) cells with negative values for sign-convention discussion."""

from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build

KEY = Path(__file__).resolve().parents[1] / ".secrets" / "finsheet-reader.json"
A_ID = "1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc"

creds = service_account.Credentials.from_service_account_file(
    str(KEY), scopes=["https://www.googleapis.com/auth/spreadsheets.readonly"]
)
svc = build("sheets", "v4", credentials=creds, cache_discovery=False)
rows = (
    svc.spreadsheets()
    .values()
    .get(spreadsheetId=A_ID, range="'OY(hkd)'")
    .execute()
    .get("values", [])
)
months = rows[0][1:]
print("Negative cells in B(Y) OY(hkd):")
for r in rows[1:]:
    if not r:
        continue
    label = r[0]
    for i, c in enumerate(r[1:]):
        s = str(c).replace(",", "").strip()
        try:
            v = float(s)
        except ValueError:
            continue
        if v < 0:
            print(f"  {label!r:30} {months[i]:6} = {v}")
