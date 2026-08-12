"""Resolve QuietLY YouTube video IDs for episodes by matching oEmbed titles."""

from __future__ import annotations

import json
import re
import urllib.request
from pathlib import Path

OUT = Path(r"D:\_home\private\ricenation\data\video-ids.json")

# Distinctive title needles per episode (English / roman / known fragments)
NEEDLES = {
    1: ["QuietLY · 靜 —", "QuietLY · 靜", "Quiet Lamp", "夜室"],
    2: ["慢步行", "Slow City", "city walk", "深夜城市"],
    3: ["山寺", "Mountain Temple", "temple"],
    4: ["冬港", "Winter Harbour", "Winter Harbor", "harbour", "harbor"],
    5: ["天文台", "Desert Observatory", "observatory", "沙漠"],
    6: ["圖書館", "Night Reading", "library", "舊圖"],
    7: ["溫泉", "Quiet Evenings", "hot-spring", "hot spring", "霧中"],
    8: ["舊戲院", "Night Listening", "cinema", "戲院"],
    9: ["夜行", "Love Story", "train", "列車"],
    10: ["電梯", "Helplessness", "Between Floors", "elevator"],
    11: ["秋江", "Seeing Through", "Overlook"],
}


def fetch(url: str) -> str:
    req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0 QuietLYBuilder/1.0"})
    with urllib.request.urlopen(req, timeout=45) as resp:
        return resp.read().decode("utf-8", "replace")


def main() -> None:
    html = fetch("https://www.youtube.com/@cafequietlysoftmusic/videos")
    ids = []
    seen = set()
    for m in re.finditer(r'"videoId":"([a-zA-Z0-9_-]{11})"', html):
        vid = m.group(1)
        if vid not in seen:
            seen.add(vid)
            ids.append(vid)

    print(f"found {len(ids)} unique video ids")
    titles = {}
    for vid in ids:
        try:
            raw = fetch(
                f"https://www.youtube.com/oembed?url=https://www.youtube.com/watch?v={vid}&format=json"
            )
            titles[vid] = json.loads(raw).get("title", "")
            print(f"{vid} | {titles[vid]}")
        except Exception as exc:  # noqa: BLE001
            print(f"{vid} ERR {exc}")

    mapping = {}
    for ep, needles in NEEDLES.items():
        for vid, title in titles.items():
            low = title.lower()
            if any(n.lower() in low or n in title for n in needles):
                mapping[str(ep)] = vid
                break
        if str(ep) not in mapping:
            print(f"UNMATCHED ep{ep}")

    # Prefer known IDs if unmatched
    mapping.setdefault("1", "YmWffBdW3_8")
    mapping.setdefault("11", "Iq842POdO2c")
    OUT.parent.mkdir(parents=True, exist_ok=True)
    OUT.write_text(json.dumps(mapping, ensure_ascii=False, indent=2), encoding="utf-8")
    print("wrote", OUT)
    print(json.dumps(mapping, ensure_ascii=False, indent=2))


if __name__ == "__main__":
    main()
