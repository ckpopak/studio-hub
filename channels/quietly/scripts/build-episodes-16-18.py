"""Build QuietLY episode-16..18 JSON (+ index merge) from quietly-ch-jazz-production.

Usage:
  N20DLE=/path/to/quietly-ch-jazz-production \\
    python channels/quietly/scripts/build-episodes-16-18.py
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
    16: "siNrbY8Op-Y",
    17: "IOQYuGxei0s",
    18: "CUxYhwK86RU",
}

EPISODE_META = {
    16: {
        "slug": "autumn-cool-forgetting",
        "title": {"en": "Autumn Cool Forgetting", "zh": "秋意聽忘"},
        "logline": "秋天不要求你記得每一件熱。它只把空氣變薄，讓多餘的名字自己淡一點。",
        "comics": [
            {"en": "Autumn does not ask you to keep every heat.", "zh": "秋天不要求你記得每一件熱。"},
            {"en": "It only thins the air.", "zh": "它只把空氣變薄。"},
            {"en": "Extra names cool until they stop asking.", "zh": "多餘的名字自己淡一點。"},
            {"en": "Forget a little heat — not the person.", "zh": "忘一點熱，不是把人抹掉。"},
        ],
        "hero_src": "assets/quietly-episode-16-hero.png",
        "hero": "assets/ep16-hero.png",
        "yt_glob": "episode-16-quietly-20songs.youtube.json",
    },
    17: {
        "slug": "winter-night-melancholy",
        "title": {"en": "Winter Night Melancholy", "zh": "冬夜聽愁"},
        "logline": "冬天把想念放進骨頭裡。它不問你為什麼難過，只在夜裡把聲音收得更薄。",
        "comics": [
            {"en": "Winter puts longing into the bone.", "zh": "冬天把想念放進骨頭裡。"},
            {"en": "It does not ask why you ache.", "zh": "它不問你為什麼難過。"},
            {"en": "Night only thins every sound.", "zh": "只在夜裡把聲音收得更薄。"},
            {"en": "Listen for 愁 without saying everything.", "zh": "聽愁，不必把一切說完。"},
        ],
        "hero_src": "assets/quietly-episode-17-hero.png",
        "hero": "assets/ep17-hero.png",
        "yt_glob": "episode-17-quietly-19songs.youtube.json",
    },
    18: {
        "slug": "mirage-dream-haze",
        "title": {"en": "Mirage Dream Haze", "zh": "醉夢聽迷"},
        "logline": "醉生夢死不必說破。它像海市蜃樓：遠看有岸、有樓，走近只剩熱氣與空。",
        "comics": [
            {"en": "You need not explain the haze.", "zh": "醉生夢死不必說破。"},
            {"en": "From far away there is a shore, a tower.", "zh": "遠看有岸、有樓。"},
            {"en": "Closer — only heat and emptiness.", "zh": "走近只剩熱氣與空。"},
            {"en": "Listen for 迷 between wake and dream.", "zh": "在醒與夢之間聽迷。"},
        ],
        "hero_src": "assets/quietly-episode-18-hero.png",
        "hero": "assets/ep18-hero.png",
        "yt_glob": "episode-18-quietly-20songs.youtube.json",
    },
}


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
            {
                "start": parse_time(time_s),
                "time": time_s,
                "left": left,
                "right": right,
            }
        )
    seen = set()
    out = []
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
        en, zh = [x.strip() for x in title.split("·", 1)]
    else:
        en, zh = title, ""
    # Some EP18 prompts may be zh · en in the H1 — normalize later via match.
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
    """Return (en, zh) using CJK density to resolve zh·en vs en·zh stamp order."""

    def cjk_count(s: str) -> int:
        return sum(1 for c in s if "\u4e00" <= c <= "\u9fff")

    left, right = stamp["left"], stamp["right"]
    if cjk_count(left) > cjk_count(right):
        zh, en = left, right
    elif cjk_count(right) > cjk_count(left):
        en, zh = left, right
    else:
        # Fall back to prompt fields, then swap if prompt head was zh·en.
        en, zh = prompt["en"], prompt["zh"]
        if cjk_count(en) > cjk_count(zh or ""):
            en, zh = zh, en
    # Prefer non-empty prompt English/Chinese when stamp English is weak
    if not en and prompt.get("en") and cjk_count(prompt["en"]) == 0:
        en = prompt["en"]
    if not zh and prompt.get("zh") and cjk_count(prompt["zh"]) > 0:
        zh = prompt["zh"]
    return en, zh


def build_episode(ep: int) -> dict:
    meta = EPISODE_META[ep]
    yt_path = N20DLE / f"video/outputs/episode-{ep:02d}" / meta["yt_glob"]
    if not yt_path.exists():
        raise FileNotFoundError(yt_path)
    yt = json.loads(yt_path.read_text(encoding="utf-8"))
    stamps = extract_timestamps(yt.get("description", ""))
    prompts = load_prompts(ep)
    by_en = {p["en"].lower(): p for p in prompts}
    by_zh = {p["zh"]: p for p in prompts if p.get("zh")}
    # Also index swapped titles for zh·en prompt heads
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

    unpublished = [p["en"] for p in prompts if p["source"] not in used]
    warnings = missing + [f"unpublished:{u}" for u in unpublished]

    # Copy hero asset into channel assets/
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
    for ep in (16, 17, 18):
        data = build_episode(ep)
        out = OUT_DIR / f"episode-{ep:02d}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
        built.append(data)
        print(
            f"Ep{ep:02d} tracks={len(data['tracks'])} "
            f"videoId={data['videoId']} hero={bool(data['hero'])} "
            f"warnings={len(data['warnings'])}"
        )
        for w in data["warnings"][:8]:
            print(f"  warn: {w}")

    # Merge into episodes-index.json
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

    # video-ids.json
    vids_path = OUT_DIR / "video-ids.json"
    vids = json.loads(vids_path.read_text(encoding="utf-8")) if vids_path.exists() else {}
    for ep, vid in VIDEO_IDS.items():
        vids[str(ep)] = vid
    # Also ensure 12-15 known from index if present
    for item in merged:
        if item.get("videoId"):
            vids[str(item["episode"])] = item["videoId"]
    vids_path.write_text(json.dumps(vids, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(f"wrote {vids_path}")


if __name__ == "__main__":
    main()
