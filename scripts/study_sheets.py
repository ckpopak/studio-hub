"""Read-only study dump of FinSheet-related Google workbooks via service account."""

from __future__ import annotations

import json
import os
import sys
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build
from googleapiclient.errors import HttpError

ROOT = Path(__file__).resolve().parents[1]
KEY_PATH = ROOT / ".secrets" / "finsheet-reader.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

SPREADSHEETS = [
    "1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc",
    "1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA",
]

SAMPLE_ROWS = 5
SA_EMAIL = "finsheet-reader@silentricenation.iam.gserviceaccount.com"


def summarize_sheet(service, spreadsheet_id: str) -> dict:
    meta = (
        service.spreadsheets()
        .get(
            spreadsheetId=spreadsheet_id,
            fields="spreadsheetId,properties.title,sheets.properties",
        )
        .execute()
    )
    title = meta.get("properties", {}).get("title", "(untitled)")
    sheets = meta.get("sheets", [])
    tabs = []
    for sheet in sheets:
        props = sheet.get("properties", {})
        tab_name = props.get("title", "")
        grid = props.get("gridProperties", {})
        row_count = grid.get("rowCount")
        col_count = grid.get("columnCount")
        header: list[str] = []
        sample: list[list[str]] = []
        approx_data_rows = 0
        try:
            result = (
                service.spreadsheets()
                .values()
                .get(
                    spreadsheetId=spreadsheet_id,
                    range=f"'{tab_name}'",
                    majorDimension="ROWS",
                )
                .execute()
            )
            values = result.get("values", [])
            if values:
                header = [str(c) for c in values[0]]
                sample = [[str(c) for c in row] for row in values[1 : 1 + SAMPLE_ROWS]]
                approx_data_rows = max(0, len(values) - 1)
        except HttpError as exc:
            tabs.append(
                {
                    "name": tab_name,
                    "error": str(exc),
                    "grid_rows": row_count,
                    "grid_cols": col_count,
                }
            )
            continue
        tabs.append(
            {
                "name": tab_name,
                "grid_rows": row_count,
                "grid_cols": col_count,
                "approx_data_rows": approx_data_rows,
                "headers": header,
                "sample_rows": sample,
            }
        )
    return {
        "spreadsheet_id": spreadsheet_id,
        "title": title,
        "tab_count": len(tabs),
        "tabs": tabs,
    }


def main() -> int:
    if not KEY_PATH.exists():
        print(f"Missing key file: {KEY_PATH}", file=sys.stderr)
        return 1

    credentials = service_account.Credentials.from_service_account_file(
        str(KEY_PATH), scopes=SCOPES
    )
    service = build("sheets", "v4", credentials=credentials, cache_discovery=False)

    reports = []
    errors = []
    for spreadsheet_id in SPREADSHEETS:
        try:
            reports.append(summarize_sheet(service, spreadsheet_id))
            print(f"OK  {spreadsheet_id}")
        except HttpError as exc:
            status = getattr(exc.resp, "status", "?")
            errors.append(
                {
                    "spreadsheet_id": spreadsheet_id,
                    "status": status,
                    "error": str(exc),
                }
            )
            print(f"FAIL {spreadsheet_id} status={status}", file=sys.stderr)
            if str(status) == "403":
                print(
                    f"Share this sheet with Viewer access to: {SA_EMAIL}",
                    file=sys.stderr,
                )

    out_path = ROOT / "docs" / "sheet-study-raw.json"
    out_path.parent.mkdir(parents=True, exist_ok=True)
    payload = {
        "service_account": SA_EMAIL,
        "project": "silentricenation",
        "reports": reports,
        "errors": errors,
    }
    out_path.write_text(json.dumps(payload, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out_path}")
    return 0 if reports and not errors else 2


if __name__ == "__main__":
    raise SystemExit(main())
