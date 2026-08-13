#!/usr/bin/env python3
"""Build Café Siam room song data from cafesiam catalog or YouTube fallback."""

from __future__ import annotations

import argparse
import json
import re
import subprocess
import sys
from datetime import datetime, timezone
from pathlib import Path

SIAM_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIAM_ROOT / "_shared"))

from rooms import ROOMS, Room  # noqa: E402

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


def find_catalog() -> Path | None:
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
    return None


def extract_lyrics(description: str) -> str:
    text = description or ""
    for marker in LYRIC_MARKERS:
        idx = text.find(marker)
        if idx >= 0:
            return text[idx + len(marker) :].strip()
    m = re.search(r"\n(\[(?:Intro|Verse|Chorus|Female|Male)[^\]]*\])", text)
    if m:
        return text[m.start(1) :].strip()
    return ""


def split_title(title: str) -> tuple[str, str, str]:
    core = PIPE_SPLIT.split(title, maxsplit=1)[0].strip()
    parts = TITLE_SPLIT.split(core, maxsplit=1)
    if len(parts) == 2:
        return core, parts[0].strip(), parts[1].strip()
    return core, core, ""


def yyyymmdd_from_timestamp(ts: int | float | None) -> str:
    if not ts:
        return ""
    return datetime.fromtimestamp(ts, tz=timezone.utc).strftime("%Y%m%d")


def load_from_catalog(room: Room, catalog_path: Path) -> list[dict]:
    raw = json.loads(catalog_path.read_text(encoding="utf-8"))
    handle = room.handle.lstrip("@").lower()
    channel_id = room.channel_id
    songs_out: list[dict] = []

    for item in raw.get("songs", []):
        item_handle = (item.get("handle") or item.get("channel_handle") or "").lstrip("@").lower()
        item_channel = item.get("channel_id") or raw.get("channel_id")
        if item_handle and item_handle != handle:
            if item_channel != channel_id:
                continue
        elif item_channel and item_channel != channel_id:
            continue

        title = item.get("title") or ""
        core, left, right = split_title(title)
        lyrics = extract_lyrics(item.get("description") or "")
        songs_out.append(
            {
                "id": item.get("id"),
                "title": title,
                "title_core": core,
                "title_jp": left,
                "title_th": right,
                "url": item.get("url")
                or f"https://www.youtube.com/watch?v={item.get('id')}",
                "upload_date": item.get("upload_date"),
                "duration_sec": item.get("duration_sec"),
                "view_count": item.get("view_count"),
                "lyrics": lyrics,
                "has_lyrics": bool(lyrics),
            }
        )
    return songs_out


def load_from_youtube(room: Room) -> list[dict]:
    handle = room.handle.lstrip("@")
    url = f"https://www.youtube.com/@{handle}/videos"
    proc = subprocess.run(
        ["yt-dlp", "--flat-playlist", "--dump-single-json", url],
        capture_output=True,
        text=True,
        check=False,
    )
    if proc.returncode != 0:
        raise SystemExit(
            f"yt-dlp failed for {url}: {proc.stderr.strip() or proc.stdout.strip()}"
        )
    data = json.loads(proc.stdout)
    entries = data.get("entries") or []
    songs_out: list[dict] = []
    for item in entries:
        vid = item.get("id")
        if not vid:
            continue
        title = item.get("title") or ""
        core, left, right = split_title(title)
        songs_out.append(
            {
                "id": vid,
                "title": title,
                "title_core": core,
                "title_jp": left,
                "title_th": right,
                "url": item.get("url") or f"https://www.youtube.com/watch?v={vid}",
                "upload_date": yyyymmdd_from_timestamp(item.get("timestamp")),
                "duration_sec": item.get("duration"),
                "view_count": item.get("view_count"),
                "lyrics": "",
                "has_lyrics": False,
            }
        )
    return songs_out


def build_payload(room: Room, songs: list[dict], source: str) -> dict:
    songs.sort(key=lambda s: s.get("upload_date") or "", reverse=True)
    return {
        "channel": room.channel_name,
        "handle": room.handle,
        "channel_id": room.channel_id,
        "channel_url": f"https://www.youtube.com/{room.handle}",
        "slug": room.slug,
        "product": room.product,
        "brand": room.brand,
        "pair_label": room.pair_label,
        "source": source,
        "count": len(songs),
        "songs": songs,
    }


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "room",
        nargs="?",
        choices=sorted(ROOMS),
        help="Room product slug (default: all rooms)",
    )
    parser.add_argument(
        "--youtube",
        action="store_true",
        help="Force YouTube flat-playlist fetch instead of cafesiam catalog",
    )
    args = parser.parse_args()

    targets = [args.room] if args.room else sorted(ROOMS)
    catalog = None if args.youtube else find_catalog()

    for product in targets:
        room = ROOMS[product]
        out = SIAM_ROOT / product / "data" / "songs.json"
        if catalog:
            songs = load_from_catalog(room, catalog)
            source = "cafesiam data/songs_catalog.json"
            if not songs:
                print(f"{product}: no catalog rows for {room.handle}; using YouTube")
                songs = load_from_youtube(room)
                source = f"YouTube {room.handle}/videos (catalog slice empty)"
        else:
            songs = load_from_youtube(room)
            source = f"YouTube {room.handle}/videos"

        payload = build_payload(room, songs, source)
        out.parent.mkdir(parents=True, exist_ok=True)
        out.write_text(
            json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
            encoding="utf-8",
        )
        print(f"Wrote {out} ({len(songs)} songs) from {source}")


if __name__ == "__main__":
    main()
