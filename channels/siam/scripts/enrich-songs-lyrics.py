#!/usr/bin/env python3
"""Fill missing Café Siam lyric sheets from n20dle / lang-song-p25-production catalogs."""

from __future__ import annotations

import argparse
import json
import os
import re
import sys
from pathlib import Path

from pythainlp import word_tokenize
from pythainlp.transliterate import romanize

SIAM_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIAM_ROOT / "_shared"))

from rooms import N20DLE_SERIES_PREFIXES, ROOMS, Room  # noqa: E402

DEFAULT_N20DLE_CATALOGS = [
    Path("/Users/apple123/_home/_thai_lang/n20dle/catalog"),
    Path(r"D:\_home\private\idea2025\n20dle\catalog"),
    Path(r"D:\_home\_thai_lang\n20dle\catalog"),
    Path("/Users/apple123/_home/_thai_lang/lang-song-p25-production/catalog"),
    Path(r"D:\_home\private\lang-song-p25-production\catalog"),
]

THAI_RE = re.compile(r"[\u0E00-\u0E7F]")
TAG_RE = re.compile(r"^\[[^\]]+\]\s*$")
HAS_ROMAN_RE = re.compile(r"[\u0E00-\u0E7F].*\([A-Za-zà-űĂ-ỹ][^)]{2,}\)")
YT_ID_RE = re.compile(r"(?:youtu\.be/|v=|videoId=)([A-Za-z0-9_-]{11})")
BARE_ID_RE = re.compile(r"^[A-Za-z0-9_-]{11}$")
SHEET_HDR = "[Lyric sheet — Romanized Thai after each Thai phrase; not sung]"

ROMAN_PATCH = {
    "ห้องน้ำ": "hong-nam",
    "เห็ด": "het",
    "อยู่": "yu",
    "ที่ไหน": "thi-nai",
    "สวัสดี": "sa-wat-dee",
    "ครับ": "khrap",
    "ค่ะ": "kha",
    "คะ": "kha",
    "ขอบคุณ": "khop-khun",
    "ขอโทษ": "kho-thot",
    "ดูแลตัวเอง": "duu-lae dtua-eeng",
    "ความหวัง": "khwaam-wang",
    "ความคิดถึง": "khwaam-khit-thueng",
}


def find_n20dle_catalog() -> Path | None:
    env = os.environ.get("N20DLE_CATALOG")
    if env:
        path = Path(env)
        return path if path.is_dir() else None
    for path in DEFAULT_N20DLE_CATALOGS:
        if path.is_dir():
            return path
    return None


def rom_thai(text: str) -> str:
    text = text.strip()
    if not text or not THAI_RE.search(text):
        return ""
    if text in ROMAN_PATCH:
        return ROMAN_PATCH[text]
    toks = [t for t in word_tokenize(text, engine="newmm") if t.strip()]
    out: list[str] = []
    for t in toks:
        if not THAI_RE.search(t):
            if re.search(r"[A-Za-z0-9]", t):
                out.append(t)
            continue
        if t in ROMAN_PATCH:
            out.append(ROMAN_PATCH[t])
            continue
        try:
            out.append(romanize(t, engine="royin"))
        except Exception:
            continue
    s = " ".join(out)
    s = re.sub(r"\s+", " ", s).strip().lower()
    s = re.sub(r"[\u0E00-\u0E7F]+", "", s)
    s = re.sub(r"\s+", " ", s).strip()
    return s


def enrich_line(line: str) -> str:
    s = line.rstrip("\n")
    if not s.strip() or TAG_RE.match(s.strip()):
        return s
    if s.strip().startswith("[Lyric sheet"):
        return s
    if not THAI_RE.search(s):
        return s

    out: list[str] = []
    last = 0
    for m in re.finditer(
        r"([\u0E00-\u0E7F]+(?:\s+[\u0E00-\u0E7F]+)*)(?:\s*\(([^)]*)\))?",
        s,
    ):
        out.append(s[last : m.start()])
        th = m.group(1)
        existing = (m.group(2) or "").strip()
        roman = existing if existing else rom_thai(th)
        if roman:
            out.append(f"{th} ({roman})")
        else:
            out.append(th)
        last = m.end()
    out.append(s[last:])
    return "".join(out)


def enrich_lyrics(text: str) -> str:
    raw = (text or "").strip()
    if not raw:
        return ""
    lines = raw.splitlines()
    new_lines = [enrich_line(L) for L in lines]
    body = "\n".join(new_lines).strip()
    if THAI_RE.search(body) and not body.startswith("[Lyric sheet"):
        body = SHEET_HDR + "\n" + body
    return body + "\n"


def extract_video_id(text: str) -> str | None:
    m = YT_ID_RE.search(text or "")
    if m:
        return m.group(1)
    try:
        data = json.loads(text)
    except Exception:
        return None
    if not isinstance(data, dict):
        return None
    for key in ("videoId", "youtube_id", "video_id", "id", "youtubeId"):
        val = data.get(key)
        if isinstance(val, str) and BARE_ID_RE.match(val):
            return val
    return None


def load_local_lyrics_map(catalog_root: Path, suffix: str) -> dict[str, str]:
    out: dict[str, str] = {}
    globs = [f"{prefix}_{suffix}/*" for prefix in N20DLE_SERIES_PREFIXES]
    seen_dirs: set[Path] = set()
    for pattern in globs:
        for song_dir in catalog_root.glob(pattern):
            if not song_dir.is_dir() or song_dir in seen_dirs:
                continue
            seen_dirs.add(song_dir)
            lyrics_path = song_dir / "lyrics.txt"
            if not lyrics_path.is_file():
                continue
            vid = None
            for meta in (
                song_dir / "meta" / "publish_result.json",
                song_dir / "meta" / "youtube.json",
                song_dir / "meta" / "upload.json",
            ):
                if not meta.is_file():
                    continue
                vid = extract_video_id(meta.read_text(encoding="utf-8", errors="replace"))
                if vid:
                    break
            if not vid:
                continue
            text = lyrics_path.read_text(encoding="utf-8", errors="replace").strip()
            if text:
                prev = out.get(vid, "")
                if len(text) >= len(prev):
                    out[vid] = text
    return out


def enrich_room(room: Room, n20dle: Path | None) -> dict:
    songs_json = SIAM_ROOT / room.product / "data" / "songs.json"
    if not songs_json.is_file():
        raise SystemExit(f"Missing {songs_json}")

    payload = json.loads(songs_json.read_text(encoding="utf-8"))
    songs = payload.get("songs") or []
    local_map = load_local_lyrics_map(n20dle, room.n20dle_suffix) if n20dle else {}

    recovered = 0
    romanized = 0
    unchanged = 0

    for song in songs:
        lyrics = (song.get("lyrics") or "").strip()
        source = "yt-desc"
        if not lyrics and song.get("id") in local_map:
            lyrics = local_map[song["id"]].strip()
            source = "n20dle-lyrics.txt"
            recovered += 1

        if not lyrics:
            song["lyrics"] = ""
            song["has_lyrics"] = False
            song.pop("lyrics_source", None)
            unchanged += 1
            continue

        before = lyrics
        if room.has_thai_roman and THAI_RE.search(lyrics):
            lyrics = enrich_lyrics(lyrics).strip()
        if lyrics != before.strip():
            romanized += 1
        else:
            unchanged += 1

        song["lyrics"] = lyrics + "\n"
        song["has_lyrics"] = True
        song["lyrics_source"] = source

    with_lyrics = sum(1 for s in songs if s.get("has_lyrics"))
    with_roman = sum(
        1 for s in songs if HAS_ROMAN_RE.search(s.get("lyrics") or "")
    )

    payload["count"] = len(songs)
    payload["songs"] = songs
    payload["lyrics_enrichment"] = {
        "n20dle_catalog": str(n20dle) if n20dle else None,
        "n20dle_suffix": room.n20dle_suffix,
        "series_prefixes": list(N20DLE_SERIES_PREFIXES),
        "local_sheets": len(local_map),
        "recovered_from_local": recovered,
        "romanized_or_updated": romanized,
        "with_lyrics": with_lyrics,
        "with_romanization": with_roman,
        "unchanged": unchanged,
    }

    songs_json.write_text(
        json.dumps(payload, ensure_ascii=False, indent=2) + "\n",
        encoding="utf-8",
    )
    return payload["lyrics_enrichment"] | {"out": str(songs_json), "songs": len(songs)}


def main() -> None:
    parser = argparse.ArgumentParser(description=__doc__)
    parser.add_argument(
        "room",
        nargs="?",
        choices=sorted(ROOMS),
        help="Room product slug (default: all rooms)",
    )
    args = parser.parse_args()
    targets = [args.room] if args.room else sorted(ROOMS)
    n20dle = find_n20dle_catalog()

    for product in targets:
        stats = enrich_room(ROOMS[product], n20dle)
        print(json.dumps({"room": product, **stats}, indent=2))


if __name__ == "__main__":
    main()
