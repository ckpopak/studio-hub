#!/usr/bin/env python3
"""Import EN×TH lyrics from lang-song-p25-production into Café Siam enthp data."""

from __future__ import annotations

import json
import re
from pathlib import Path

ENTHP = Path(__file__).resolve().parents[1]
SONGS_PATH = ENTHP / "data" / "songs.json"

DEFAULT_PROD = Path("/tmp/cafesiam-src")
YT_RE = re.compile(r"youtu\.be/([A-Za-z0-9_-]{11})|watch\?v=([A-Za-z0-9_-]{11})")


def norm_title(t: str) -> str:
    t = (t or "").lower()
    t = re.sub(r"\s*[|｜].*$", "", t)
    t = re.sub(r"\s*[×x]\s*", " ", t)
    t = re.sub(r"[^a-z0-9\u0e00-\u0e7f]+", " ", t)
    return re.sub(r"\s+", " ", t).strip()


def extract_vid(text: str) -> str | None:
    m = YT_RE.search(text or "")
    if not m:
        return None
    return m.group(1) or m.group(2)


def iter_thai_song_dirs(prod: Path):
    catalog = prod / "n20dle" / "catalog"
    for folder in catalog.glob("*_thai/*"):
        if folder.is_dir() and (folder / "lyrics.txt").is_file():
            yield folder


def main() -> None:
    import os

    prod = Path(os.environ.get("LANG_SONG_PROD", DEFAULT_PROD))
    if not prod.is_dir():
        raise SystemExit(f"Production repo not found: {prod}")

    data = json.loads(SONGS_PATH.read_text(encoding="utf-8"))
    songs = data["songs"]
    by_id = {s["id"]: s for s in songs}

    by_title: dict[str, str] = {}
    for s in songs:
        for key in (
            s.get("title_core"),
            s.get("title_en"),
            s.get("title_jp"),
            s.get("title_th"),
            s.get("title"),
        ):
            n = norm_title(key or "")
            if n and len(n) > 5:
                by_title.setdefault(n, s["id"])

    imported = 0
    by_vid = 0
    by_title_hit = 0
    sources: dict[str, int] = {}

    for folder in iter_thai_song_dirs(prod):
        lyrics = (folder / "lyrics.txt").read_text(encoding="utf-8", errors="ignore").strip()
        if not lyrics:
            continue

        vid = None
        pr = folder / "meta" / "publish_result.json"
        if pr.exists():
            vid = extract_vid(pr.read_text(encoding="utf-8", errors="ignore"))

        title = ""
        yt = folder / "meta" / "youtube.json"
        if yt.exists():
            try:
                yd = json.loads(yt.read_text(encoding="utf-8"))
                title = yd.get("title") or ""
                if not vid:
                    vid = extract_vid(json.dumps(yd))
            except json.JSONDecodeError:
                pass

        match_how = None
        if vid and vid in by_id:
            match_how = "videoId"
            by_vid += 1
        else:
            candidates = []
            if title:
                candidates.append(norm_title(title))
            slug = re.sub(r"^\d{4}-\d{2}-\d{2}[a-z0-9]*_", "", folder.name).replace("-", " ")
            candidates.append(norm_title(slug))
            for c in candidates:
                if c in by_title:
                    vid = by_title[c]
                    match_how = "title"
                    by_title_hit += 1
                    break
            if not match_how:
                continue

        song = by_id[vid]
        # Prefer production lyrics (authoritative)
        song["lyrics"] = lyrics
        song["has_lyrics"] = True
        song["lyrics_source"] = f"lang-song-p25:{folder.relative_to(prod)}"
        song["production_folder"] = str(folder.relative_to(prod))
        if title and not song.get("title"):
            song["title"] = title
        imported += 1
        sources[match_how] = sources.get(match_how, 0) + 1

    data["count"] = len(songs)
    data["lyrics_import"] = {
        "source_repo": "ckpopak/lang-song-p25-production",
        "imported": imported,
        "by_videoId": by_vid,
        "by_title": by_title_hit,
        "with_lyrics": sum(1 for s in songs if s.get("has_lyrics")),
    }
    SONGS_PATH.write_text(
        json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8"
    )
    print(json.dumps(data["lyrics_import"], indent=2))


if __name__ == "__main__":
    main()
