"""Deeper structural dump for FinSheet sheet study."""

from __future__ import annotations

import json
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parents[1]
KEY = ROOT / ".secrets" / "finsheet-reader.json"
SCOPES = ["https://www.googleapis.com/auth/spreadsheets.readonly"]

A_ID = "1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc"
B_ID = "1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA"


def main() -> None:
    creds = service_account.Credentials.from_service_account_file(
        str(KEY), scopes=SCOPES
    )
    svc = build("sheets", "v4", credentials=creds, cache_discovery=False)

    a_vals = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=A_ID, range="'OY(hkd)'")
        .execute()
        .get("values", [])
    )
    line_items = []
    for i, row in enumerate(a_vals[1:], start=2):
        label = row[0] if row else ""
        nonempty = sum(1 for c in row[1:] if str(c).strip() not in ("", "0", "0.0"))
        line_items.append(
            {"row": i, "label": label, "nonzero_months": nonempty}
        )

    b_vals = (
        svc.spreadsheets()
        .values()
        .get(spreadsheetId=B_ID, range="'_cflow'")
        .execute()
        .get("values", [])
    )
    labels = [r[0] if r else "" for r in b_vals]

    out = {
        "workbook_a": {
            "title": "Protected - B(Y) - v5.0 (2026)",
            "id": A_ID,
            "tab": "OY(hkd)",
            "month_headers": a_vals[0][1:] if a_vals else [],
            "line_items": line_items,
        },
        "workbook_b": {
            "title": "Protected - B(M) - v5.0 (2026)",
            "id": B_ID,
            "tab": "_cflow",
            "row_count": len(b_vals),
            "first_12_rows": b_vals[:12],
            "rows_40_55": b_vals[39:55],
            "last_8_rows": b_vals[-8:],
            "col0_first50": labels[:50],
            "col0_last20": labels[-20:],
        },
    }
    path = ROOT / "docs" / "sheet-study-detail.json"
    path.write_text(json.dumps(out, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {path}")
    print("A line items:")
    for item in line_items:
        print(f"  {item['label']!r} nonzero={item['nonzero_months']}")
    print("B first 12 rows:")
    for row in b_vals[:12]:
        print(" ", row)


if __name__ == "__main__":
    main()
