"""Build QuietLY episode-19..21 JSON (+ index merge) from quietly-ch-jazz-production.

Usage:
  N20DLE=/path/to/quietly-ch-jazz-production \\
    python channels/quietly/scripts/build-episodes-19-21.py
"""

from __future__ import annotations

import json
import os
import re
import shutil
from pathlib import Path

CHANNEL_ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = CHANNEL_ROOT / "data"
ASSETS = CHANNEL_ROOT / "assets"
N20DLE = Path(os.environ.get("N20DLE", "/tmp/quietly-ch"))

VIDEO_IDS = {
    19: "_ZynZ-N2-DY",
    20: "gb56Wr6TZPk",
    21: "e-SNL8sZMUM",
}

EPISODE_META = {
    19: {
        "slug": "before-mountain-rain",
        "title": {"en": "Before the Mountain Rain", "zh": "山雨欲來聽風"},
        "logline": "山雨欲來，風先滿樓。雨整集不落地——只聽風把天壓低。",
        "comics": [
            {"en": "Mountain rain is coming; wind fills the tower first.", "zh": "山雨欲來，風先滿樓。"},
            {"en": "The ground stays dry.", "zh": "雨整集不落地。"},
            {"en": "Listen only to the wind pressing the sky down.", "zh": "只聽風把天壓低。"},
            {"en": "Grass bends; the storm has not yet arrived.", "zh": "草先彎，雨還沒到。"},
        ],
        "hero_src": "assets/quietly-episode-19-hero.png",
        "hero": "assets/ep19-hero.png",
        "yt_glob": "episode-19-quietly-20songs.youtube.json",
    },
    20: {
        "slug": "orion-edge-delusion",
        "title": {"en": "Orion Edge Delusion", "zh": "獵戶星聽惑"},
        "logline": "獵戶星在召喚。惑不是警報——是一段早已住在記憶裡的旋律。",
        "comics": [
            {"en": "Orion is calling.", "zh": "獵戶星在召喚。"},
            {"en": "惑 is not an alarm.", "zh": "惑不是警報。"},
            {"en": "It is a melody that already lives in memory.", "zh": "是一段早已住在記憶裡的旋律。"},
            {"en": "Choose before the star-gate closes.", "zh": "在星門關上以前做選擇。"},
        ],
        "hero_src": "assets/quietly-episode-20-hero.png",
        "hero": "assets/ep20-hero.png",
        "yt_glob": "episode-20-quietly-20songs.youtube.json",
    },
    21: {
        "slug": "empty-room-linger",
        "title": {"en": "Empty Room Linger", "zh": "空房聽留"},
        "logline": "空房還在。留不是重播——是把雨後那一間房，再聽深一層。",
        "comics": [
            {"en": "The empty room is still here.", "zh": "空房還在。"},
            {"en": "留 is not a reupload.", "zh": "留不是重播。"},
            {"en": "It is listening one layer deeper after rain.", "zh": "是把雨後那一間房，再聽深一層。"},
            {"en": "Ten remixed corners, ten new ones of the same night.", "zh": "十首再聽，十個同一夜的新角落。"},
        ],
        "hero_src": "assets/quietly-episode-21-hero.png",
        "hero": "assets/ep21-hero.png",
        "yt_glob": "episode-21-quietly-20songs.youtube.json",
    },
}


def cjk_count(s: str) -> int:
    return sum(1 for c in s if "\u4e00" <= c <= "\u9fff")


def parse_time(t: str) -> int:
    parts = [int(x) for x in t.split(":")]
    if len(parts) == 2:
        return parts[0] * 60 + parts[1]
    if len(parts) == 3:
        return parts[0] * 3600 + parts[1] * 60 + parts[2]
    raise ValueError(t)


def extract_timestamps(description: str) -> list[dict]:
    rows = []
    section = description
    m = re.search(r"TRACKLIST\s*\n([\s\S]*?)(?:\n------|\nPOETRY|\n#|\Z)", description)
    if m:
        section = m.group(1)
    pattern = re.compile(r"(?m)^((?:\d+:)?\d+:\d+)\s+(.+?)\s*·\s*(.+?)\s*$")
    for hit in pattern.finditer(section):
        time_s, left, right = hit.group(1), hit.group(2).strip(), hit.group(3).strip()
        if left.lower().startswith("http"):
            continue
        rows.append(
            {"start": parse_time(time_s), "time": time_s, "left": left, "right": right}
        )
    seen, out = set(), []
    for r in rows:
        key = (r["start"], r["left"].lower(), r["right"].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def parse_prompt(path: Path) -> dict:
    text = path.read_text(encoding="utf-8")
    n = path.name.split("-", 1)[0]
    title_m = re.search(r"^#\s+\d+\s+[—-]\s+(.+)$", text, re.M)
    title = title_m.group(1).strip() if title_m else path.stem
    if "·" in title:
        a, b = [x.strip() for x in title.split("·", 1)]
    else:
        a, b = title, ""
    if cjk_count(a) > cjk_count(b or ""):
        zh, en = a, b
    else:
        en, zh = a, b
    voice_m = re.search(r"\*\*Voice:\*\*\s*(.+)", text)
    lyrics_m = re.search(r"\*\*Lyrics\*\*\s*\n```\n([\s\S]*?)\n```", text)
    if not lyrics_m:
        lyrics_m = re.search(r"\*\*Lyrics\*\*\s*\n```([\s\S]*?)```", text)
    if not lyrics_m:
        raise ValueError(f"No Lyrics block in {path}")
    return {
        "n": n.zfill(2) if n.isdigit() else n,
        "en": en,
        "zh": zh,
        "voice": voice_m.group(1).strip() if voice_m else "",
        "lyrics": lyrics_m.group(1).strip("\n"),
        "source": f"songs/prompts/{path.parent.name}/{path.name}",
    }


def load_prompts(ep: int) -> list[dict]:
    prompt_dir = N20DLE / f"songs/prompts/episode-{ep:02d}"
    if not prompt_dir.exists():
        raise FileNotFoundError(prompt_dir)
    return [parse_prompt(p) for p in sorted(prompt_dir.glob("*.md"))]


def match_prompt(stamp: dict, by_en: dict, by_zh: dict) -> dict | None:
    left, right = stamp["left"], stamp["right"]
    return (
        by_en.get(left.lower())
        or by_zh.get(right)
        or by_en.get(right.lower())
        or by_zh.get(left)
        or None
    )


def normalize_titles(prompt: dict, stamp: dict) -> tuple[str, str]:
    left, right = stamp["left"], stamp["right"]
    if cjk_count(left) > cjk_count(right):
        zh, en = left, right
    elif cjk_count(right) > cjk_count(left):
        en, zh = left, right
    else:
        en, zh = prompt["en"], prompt["zh"]
        if cjk_count(en) > cjk_count(zh or ""):
            en, zh = zh, en
    return en, zh


def build_episode(ep: int) -> dict:
    meta = EPISODE_META[ep]
    yt_path = N20DLE / f"video/outputs/episode-{ep:02d}" / meta["yt_glob"]
    if not yt_path.exists():
        raise FileNotFoundError(yt_path)
    yt = json.loads(yt_path.read_text(encoding="utf-8"))
    stamps = extract_timestamps(yt.get("description", ""))
    prompts = load_prompts(ep)
    by_en = {p["en"].lower(): p for p in prompts if p.get("en")}
    by_zh = {p["zh"]: p for p in prompts if p.get("zh")}
    for p in prompts:
        if p.get("zh"):
            by_en.setdefault(p["zh"].lower(), p)
        if p.get("en"):
            by_zh.setdefault(p["en"], p)

    tracks = []
    used = set()
    missing = []
    for i, stamp in enumerate(stamps):
        p = match_prompt(stamp, by_en, by_zh)
        if not p:
            missing.append(f"{stamp['left']} · {stamp['right']}")
            continue
        used.add(p["source"])
        en, zh = normalize_titles(p, stamp)
        tracks.append(
            {
                "n": str(i + 1).zfill(2),
                "start": stamp["start"],
                "time": stamp["time"],
                "en": en,
                "zh": zh,
                "voice": p["voice"],
                "lyrics": p["lyrics"],
                "source": p["source"],
            }
        )

    unpublished = [p["en"] or p["zh"] for p in prompts if p["source"] not in used]
    warnings = missing + [f"unpublished:{u}" for u in unpublished]

    src = N20DLE / meta["hero_src"]
    dest = CHANNEL_ROOT / meta["hero"]
    if src.exists():
        ASSETS.mkdir(parents=True, exist_ok=True)
        shutil.copy2(src, dest)

    return {
        "episode": ep,
        "slug": meta["slug"],
        "title": meta["title"],
        "logline": meta["logline"],
        "videoId": VIDEO_IDS[ep],
        "youtubeTitle": yt.get("title", ""),
        "comics": meta["comics"],
        "hero": meta["hero"] if dest.exists() else "",
        "comicImages": [],
        "tracks": tracks,
        "warnings": warnings,
        "lyricsSource": f"songs/prompts/episode-{ep:02d}/*.md",
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    built = []
    for ep in (19, 20, 21):
        data = build_episode(ep)
        out = OUT_DIR / f"episode-{ep:02d}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        built.append(data)
        print(
            f"Ep{ep:02d} tracks={len(data['tracks'])} videoId={data['videoId']} "
            f"hero={bool(data['hero'])} warnings={len(data['warnings'])}"
        )
        for w in data["warnings"][:8]:
            print(f"  warn: {w}")
        if data["tracks"]:
            t0, tL = data["tracks"][0], data["tracks"][-1]
            print(f"  first {t0['en']} · {t0['zh']} ({t0['time']})")
            print(f"  last  {tL['en']} · {tL['zh']} ({tL['time']})")

    index_path = OUT_DIR / "episodes-index.json"
    index = json.loads(index_path.read_text(encoding="utf-8")) if index_path.exists() else []
    by_ep = {item["episode"]: item for item in index}
    for data in built:
        by_ep[data["episode"]] = {
            "episode": data["episode"],
            "slug": data["slug"],
            "title": data["title"],
            "logline": data["logline"],
            "trackCount": len(data["tracks"]),
            "videoId": data["videoId"],
            "href": f"worlds/{data['slug']}.html",
            "hasHero": bool(data.get("hero")),
            "warnings": data.get("warnings", []),
        }
    merged = [by_ep[k] for k in sorted(by_ep)]
    index_path.write_text(json.dumps(merged, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"index episodes={[x['episode'] for x in merged]}")

    vids_path = OUT_DIR / "video-ids.json"
    vids = json.loads(vids_path.read_text(encoding="utf-8")) if vids_path.exists() else {}
    for item in merged:
        if item.get("videoId"):
            vids[str(item["episode"])] = item["videoId"]
    vids_path.write_text(json.dumps(vids, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")


if __name__ == "__main__":
    main()
