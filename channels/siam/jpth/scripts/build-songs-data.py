#!/usr/bin/env python3
"""Build ricenation Café Siam JP×TH song data from cafesiam catalog."""

from __future__ import annotations

import json
import re
from pathlib import Path

CHANNEL_ROOT = Path(__file__).resolve().parents[1]
OUT = CHANNEL_ROOT / "data" / "songs.json"

# Prefer local cafesiam / idea2025 checkout; override with CAFESIAM_CATALOG.
DEFAULT_CATALOGS = [
    Path("/Users/apple123/_home/_thai_lang/data/songs_catalog.json"),
    Path(r"D:\_home\private\idea2025\data\songs_catalog.json"),
    Path(r"D:\_home\private\cafesiam\data\songs_catalog.json"),
]

LYRIC_MARKERS = (
    "—— Lyrics ——",
    "--- Lyrics ---",
    "-- Lyrics --",
    "Lyrics ——",
)

TITLE_SPLIT = re.compile(r"\s*[×x]\s*", re.UNICODE)
PIPE_SPLIT = re.compile(r"\s*\|\s*")


def find_catalog() -> Path:
    import os

    env = os.environ.get("CAFESIAM_CATALOG")
    if env:
        path = Path(env)
        if not path.is_file():
            raise SystemExit(f"CAFESIAM_CATALOG not found: {path}")
        return path
    for path in DEFAULT_CATALOGS:
        if path.is_file():
            return path
    raise SystemExit(
        "songs_catalog.json not found. Set CAFESIAM_CATALOG or clone cafesiam."
    )


def extract_lyrics(description: str) -> str:
    text = description or ""
    for marker in LYRIC_MARKERS:
        idx = text.find(marker)
        if idx >= 0:
            return text[idx + len(marker) :].strip()
    # Fallback: first [Intro] / [Verse] block onward
    m = re.search(r"\n(\[(?:Intro|Verse|Chorus|Female|Male)[^\]]*\])", text)
    if m:
        return text[m.start(1) :].strip()
    return ""


def split_title(title: str) -> tuple[str, str, str]:
    """Return (display_core, jp, th_or_rest)."""
    core = PIPE_SPLIT.split(title, maxsplit=1)[0].strip()
    parts = TITLE_SPLIT.split(core, maxsplit=1)
    if len(parts) == 2:
        return core, parts[0].strip(), parts[1].strip()
    return core, core, ""


def main() -> None:
    catalog_path = find_catalog()
    raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    songs_out = []
    for item in raw.get("songs", []):
        title = item.get("title") or ""
        core, jp, th = split_title(title)
        lyrics = extract_lyrics(item.get("description") or "")
        songs_out.append(
            {
                "id": item.get("id"),
                "title": title,
                "title_core": core,
                "title_jp": jp,
                "title_th": th,
                "url": item.get("url")
                or f"https://www.youtube.com/watch?v={item.get('id')}",
                "upload_date": item.get("upload_date"),
                "duration_sec": item.get("duration_sec"),
                "view_count": item.get("view_count"),
                "lyrics": lyrics,
                "has_lyrics": bool(lyrics),
            }
        )

    songs_out.sort(key=lambda s: s.get("upload_date") or "", reverse=True)

    payload = {
        "channel": "Cafe' Siam | Soft Music & Thai–Japanese Listening",
        "handle": "@cafesiamsoftmusicthaijapanese",
        "channel_id": raw.get("channel_id") or "UCJdG-tCXK2sY31JhFxf_vog",
        "channel_url": "https://www.youtube.com/@cafesiamsoftmusicthaijapanese",
        "slug": "siam/jpth",
        "product": "jpth",
        "source": "cafesiam data/songs_catalog.json",
        "count": len(songs_out),
        "songs": songs_out,
    }

    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    print(f"Wrote {OUT} ({len(songs_out)} songs) from {catalog_path}")


if __name__ == "__main__":
    main()
