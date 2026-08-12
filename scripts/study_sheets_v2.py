"""Richer re-study of both finance workbooks after user updates."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

from google.oauth2 import service_account
from googleapiclient.discovery import build

ROOT = Path(__file__).resolve().parents[1]
KEY = ROOT / ".secrets" / "finsheet-reader.json"
SCOPES = [
    "https://www.googleapis.com/auth/spreadsheets.readonly",
    "https://www.googleapis.com/auth/drive.readonly",
]
A_ID = "1dLumPx3m2dEZjmkG0GA2IUc9vcpnoN5-Rx82abHyemc"
B_ID = "1Ub9LDhs1rcm-NTdeIYyCCRgK8oEQ5bSTKGW5Mrs5_vA"


def get_services():
    creds = service_account.Credentials.from_service_account_file(
        str(KEY), scopes=SCOPES
    )
    sheets = build("sheets", "v4", credentials=creds, cache_discovery=False)
    drive = build("drive", "v3", credentials=creds, cache_discovery=False)
    return sheets, drive


def drive_meta(drive, file_id: str) -> dict:
    return (
        drive.files()
        .get(
            fileId=file_id,
            fields="id,name,modifiedTime,createdTime,owners(emailAddress,displayName),description",
            supportsAllDrives=True,
        )
        .execute()
    )


def sheet_meta(sheets, spreadsheet_id: str) -> dict:
    return (
        sheets.spreadsheets()
        .get(
            spreadsheetId=spreadsheet_id,
            fields="spreadsheetId,properties,sheets.properties,namedRanges",
        )
        .execute()
    )


def values(sheets, spreadsheet_id: str, a1: str) -> list[list[str]]:
    return (
        sheets.spreadsheets()
        .values()
        .get(spreadsheetId=spreadsheet_id, range=a1)
        .execute()
        .get("values", [])
    )


def analyze_yearly(rows: list[list[str]]) -> dict:
    months = rows[0][1:] if rows else []
    items = []
    for r in rows[1:]:
        if not r:
            continue
        label = r[0]
        nums = []
        for c in r[1:]:
            s = str(c).replace(",", "").strip()
            try:
                nums.append(float(s))
            except ValueError:
                nums.append(None)
        nonzero = [n for n in nums if n not in (None, 0.0)]
        items.append(
            {
                "label": label,
                "filled": len([n for n in nums if n is not None]),
                "nonzero": len(nonzero),
                "min": min(nonzero) if nonzero else None,
                "max": max(nonzero) if nonzero else None,
                "first6": nums[:6],
                "last3": nums[-3:],
            }
        )
    return {"months": months, "month_count": len(months), "line_items": items}


def analyze_cflow(rows: list[list[str]]) -> dict:
    col0 = [r[0] if r else "" for r in rows]
    patterns = Counter()
    for lab in col0:
        if not lab:
            patterns["(blank)"] += 1
        elif re.fullmatch(r"\d{1,2}_M", lab):
            patterns["N_M standing-order marker"] += 1
        elif re.fullmatch(r"\d{1,2}[A-Za-z]{3}", lab):
            patterns["DMon date like 7Mar"] += 1
        elif re.fullmatch(r"[A-Za-z]{3}", lab):
            patterns["Mon month label"] += 1
        else:
            patterns[f"other:{lab}"] += 1

    # Find month section markers and note density
    note_rows = 0
    in_sum = 0.0
    out_sum = 0.0
    for r in rows[1:]:
        note = r[4] if len(r) > 4 else ""
        if str(note).strip():
            note_rows += 1
        for idx in (2, 5):  # IN cols
            if len(r) > idx and str(r[idx]).strip():
                try:
                    in_sum += float(str(r[idx]).replace(",", ""))
                except ValueError:
                    pass
        for idx in (3, 6):  # OUT cols
            if len(r) > idx and str(r[idx]).strip():
                try:
                    out_sum += float(str(r[idx]).replace(",", ""))
                except ValueError:
                    pass

    month_markers = [
        (i + 1, lab) for i, lab in enumerate(col0) if re.fullmatch(r"[A-Za-z]{3}", lab)
    ]
    sample_notes = []
    for r in rows:
        note = r[4] if len(r) > 4 else ""
        if str(note).strip():
            sample_notes.append(str(note).strip())
        if len(sample_notes) >= 25:
            break

    return {
        "row_count": len(rows),
        "header": rows[0] if rows else [],
        "col0_pattern_counts": dict(patterns),
        "month_markers": month_markers[:40],
        "rows_with_notes": note_rows,
        "approx_in_sum_all_in_cols": in_sum,
        "approx_out_sum_all_out_cols": out_sum,
        "sample_notes": sample_notes,
        "first_15": rows[:15],
        "mid_slice": rows[150:165] if len(rows) > 165 else [],
        "last_10": rows[-10:],
    }


def main() -> None:
    sheets, drive = get_services()
    report = {"workbooks": []}

    for sid, label in [(A_ID, "A_yearly"), (B_ID, "B_monthly")]:
        dmeta = drive_meta(drive, sid)
        smeta = sheet_meta(sheets, sid)
        tabs = []
        for sh in smeta.get("sheets", []):
            props = sh.get("properties", {})
            tabs.append(
                {
                    "title": props.get("title"),
                    "sheetId": props.get("sheetId"),
                    "index": props.get("index"),
                    "grid": props.get("gridProperties"),
                    "hidden": props.get("hidden"),
                }
            )
        entry = {
            "label": label,
            "drive": dmeta,
            "title": smeta.get("properties", {}).get("title"),
            "locale": smeta.get("properties", {}).get("locale"),
            "timeZone": smeta.get("properties", {}).get("timeZone"),
            "namedRanges": smeta.get("namedRanges", []),
            "tabs": tabs,
        }

        if label == "A_yearly":
            rows = values(sheets, sid, "'OY(hkd)'")
            entry["analysis"] = analyze_yearly(rows)
        else:
            # dump every tab lightly
            tab_analyses = {}
            for t in tabs:
                name = t["title"]
                rows = values(sheets, sid, f"'{name}'")
                if name == "_cflow":
                    tab_analyses[name] = analyze_cflow(rows)
                else:
                    tab_analyses[name] = {
                        "row_count": len(rows),
                        "first_5": rows[:5],
                    }
            entry["analysis"] = tab_analyses

        report["workbooks"].append(entry)
        print(f"OK {label}: {dmeta.get('name')} modified={dmeta.get('modifiedTime')}")
        print(f"  tabs: {[t['title'] for t in tabs]}")

    out = ROOT / "docs" / "sheet-study-v2.json"
    out.write_text(json.dumps(report, indent=2, ensure_ascii=False), encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
