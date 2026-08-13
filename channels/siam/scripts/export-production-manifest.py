#!/usr/bin/env python3
"""Export lang-song-p25-production cross-check manifest for studio-hub."""

from __future__ import annotations

import json
import sys
from pathlib import Path

SIAM_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIAM_ROOT / "_shared"))

from rooms import N20DLE_SERIES_PREFIXES, ROOMS  # noqa: E402


def main() -> None:
    rooms_out = []
    for product, room in ROOMS.items():
        songs_json = SIAM_ROOT / product / "data" / "songs.json"
        stats = {
            "count": 0,
            "with_lyrics": 0,
            "with_romanization": 0,
            "source": None,
        }
        if songs_json.is_file():
            payload = json.loads(songs_json.read_text(encoding="utf-8"))
            songs = payload.get("songs") or []
            enrich = payload.get("lyrics_enrichment") or {}
            stats = {
                "count": payload.get("count") or len(songs),
                "with_lyrics": enrich.get("with_lyrics")
                or sum(1 for s in songs if s.get("has_lyrics")),
                "with_romanization": enrich.get("with_romanization", 0),
                "source": payload.get("source"),
            }
        rooms_out.append(
            {
                "product": room.product,
                "slug": room.slug,
                "pair_label": room.pair_label,
                "pair_short": room.pair_short,
                "handle": room.handle,
                "channel_id": room.channel_id,
                "channel_url": f"https://www.youtube.com/{room.handle}",
                "brand": room.brand,
                "n20dle_suffix": room.n20dle_suffix,
                "has_thai_roman": room.has_thai_roman,
                "catalog_globs": [
                    f"{prefix}_{room.n20dle_suffix}/*" for prefix in N20DLE_SERIES_PREFIXES
                ],
                "stats": stats,
            }
        )

    manifest = {
        "pipeline": "lang-song-p25-production",
        "description": (
            "Café Siam room definitions cross-checked with lang-song-p25-production "
            "catalog series naming (mirrors legacy daily20_* suffix layout)."
        ),
        "series_prefixes": list(N20DLE_SERIES_PREFIXES),
        "rooms": rooms_out,
        "rebuild": {
            "cafesiam_catalog_env": "CAFESIAM_CATALOG",
            "n20dle_catalog_env": "N20DLE_CATALOG",
            "build": "python channels/siam/scripts/build-songs-data.py",
            "enrich": "python channels/siam/scripts/enrich-songs-lyrics.py",
        },
    }

    out = SIAM_ROOT / "_shared" / "production-crosscheck.json"
    out.write_text(json.dumps(manifest, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"Wrote {out}")


if __name__ == "__main__":
    main()
