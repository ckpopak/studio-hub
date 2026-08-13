"""One-off builder: write episode-12..15 data JSON for the QuietLY atlas.

Reads track metadata parsed from the source repo tracklists and emits
data/episode-{n}.json in the shape episode-player.js expects.
"""

import io
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
DATA = os.path.normpath(os.path.join(HERE, "..", "data"))
TMP = os.path.join(os.environ["TEMP"], "n20dle-src")


def main() -> None:
    for e in (12, 13, 14, 15):
        with io.open(
            os.path.join(TMP, f"ep{e}-meta.json"), encoding="utf-8"
        ) as fh:
            m = json.load(fh)

        tracks = [
            {
                "n": t["n"],
                "start": 0,
                "time": "0:00",
                "en": t["en"],
                "zh": t["zh"],
                "voice": t["voice"],
                "lyrics": "",
                "source": f"songs/prompts/episode-{e:02d}/",
            }
            for t in m["tracks"]
        ]

        data = {
            "episode": e,
            "slug": m["slug"],
            "title": {"en": m["en"], "zh": m["zh"]},
            "logline": m["log"],
            "videoId": m["vid"],
            "youtubeTitle": f"[playlist] QuietLY · {m['zh']} — Slow Mandarin Jazz",
            "comics": [{"en": c[0], "zh": c[1]} for c in m["comics"]],
            "hero": f"assets/ep{e}-hero.png",
            "comicImages": [],
            "tracks": tracks,
        }

        path = os.path.join(DATA, f"episode-{e:02d}.json")
        with io.open(path, "w", encoding="utf-8") as fh:
            json.dump(data, fh, ensure_ascii=False, indent=2)
            fh.write("\n")
        print(f"wrote {path} ({len(tracks)} tracks)")


if __name__ == "__main__":
    sys.exit(main())
