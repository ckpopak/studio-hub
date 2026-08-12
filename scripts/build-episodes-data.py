"""Build QuietLY field-notes JSON for episodes 01-11 from n20dle prompts."""

from __future__ import annotations

import json
import re
from pathlib import Path

N20DLE = Path(r"D:\_home\private\n20dle")
OUT_DIR = Path(r"D:\_home\private\ricenation\data")

# Manual map: episode -> YouTube videoId (filled/updated by resolve script or known IDs)
VIDEO_IDS = {
    1: "YmWffBdW3_8",
    11: "Iq842POdO2c",
}

# Episode 01 prompts live flat under songs/prompts/ (no episode-01 folder).
EP01_PROMPT_FILES = [
    "01-quiet-lamp.md",
    "02-late-rain.md",
    "03-empty-window.md",
    "04-cooling-tea.md",
    "05-thin-moon.md",
    "06-distant-mist.md",
    "07-empty-chair.md",
    "08-old-radio.md",
    "09-far-lantern.md",
    "10-after-the-rain.md",
]

# Theme metadata for packaging (EN · ZH). Comics are caption-first; images optional.
EPISODE_META = {
    1: {
        "slug": "night-room-rain-archive",
        "title": {"en": "Night-Room Rain Archive", "zh": "夜室雨檔"},
        "logline": "A room that does not hurry. One lamp, late rain, and ten quiet Mandarin jazz scenes.",
        "comics": [
            {"en": "One lamp stays after the rain.", "zh": "一盞燈留在雨後。"},
            {"en": "The window keeps the water moving slowly.", "zh": "窗上的水慢慢走。"},
            {"en": "An empty chair keeps the tea warm in memory.", "zh": "空椅守著茶香。"},
            {"en": "No one asks the night to answer.", "zh": "沒有人要夜回答。"},
        ],
    },
    2: {
        "slug": "slow-city-walk",
        "title": {"en": "Slow City Walk", "zh": "深夜城市慢步行"},
        "logline": "A quiet walk through the late city. Footsteps soft; neon far.",
        "comics": [
            {"en": "The street empties into longer shadows.", "zh": "街把影子拉長。"},
            {"en": "Shop lights stay on for no one.", "zh": "店燈還亮，卻不為誰。"},
            {"en": "Your pace becomes the only tempo.", "zh": "腳步成了唯一的拍子。"},
            {"en": "The city keeps breathing, quieter.", "zh": "城市還在呼吸，只是更輕。"},
        ],
    },
    3: {
        "slug": "mountain-temple-afternoon",
        "title": {"en": "Mountain Temple Afternoon", "zh": "山寺午後"},
        "logline": "An afternoon at a mountain temple: incense thin, stone warm, time unhurried.",
        "comics": [
            {"en": "Incense thins into the pine air.", "zh": "香煙淡進松風。"},
            {"en": "Stone steps remember every pause.", "zh": "石階記得每一次停頓。"},
            {"en": "A bell waits without insisting.", "zh": "鐘聲等著，卻不催促。"},
            {"en": "Afternoon light stays on the courtyard.", "zh": "午後光停在庭中。"},
        ],
    },
    4: {
        "slug": "winter-harbor",
        "title": {"en": "Winter Harbor", "zh": "海邊冬港"},
        "logline": "A winter harbour at low tide: ropes, cold air, water leaving quietly.",
        "comics": [
            {"en": "The tide table no longer argues.", "zh": "潮汐表不再爭辯。"},
            {"en": "Ropes hold what the water released.", "zh": "繩子握著水留下的。"},
            {"en": "Cold light on empty boats.", "zh": "冷光落在空船上。"},
            {"en": "Harbor wind edits every sentence.", "zh": "港風改寫每一句話。"},
        ],
    },
    5: {
        "slug": "desert-observatory",
        "title": {"en": "Desert Observatory", "zh": "午夜沙漠天文台"},
        "logline": "A midnight desert observatory: first stars, cold dome, long silence.",
        "comics": [
            {"en": "The dome opens like a held breath.", "zh": "圓頂打開，像屏住的呼吸。"},
            {"en": "Stars arrive without announcement.", "zh": "星辰到來，沒有預告。"},
            {"en": "Sand keeps the day's heat as rumor.", "zh": "沙把白日熱度當成傳聞。"},
            {"en": "The sky is the only loud thing.", "zh": "天空成了唯一的大聲。"},
        ],
    },
    6: {
        "slug": "late-library",
        "title": {"en": "Late Library", "zh": "深夜舊圖書館"},
        "logline": "A midnight old library: closing hour to the last unread page.",
        "comics": [
            {"en": "Shelves keep their own weather.", "zh": "書架有自己的天氣。"},
            {"en": "A lamp stays loyal to one desk.", "zh": "燈忠於一張桌。"},
            {"en": "Dust turns footsteps into soft drums.", "zh": "灰塵把腳步變成輕鼓。"},
            {"en": "Closing hour is still a kind of opening.", "zh": "打烊仍是一種開始。"},
        ],
    },
    7: {
        "slug": "fog-hot-spring-inn",
        "title": {"en": "Fog Hot-Spring Inn", "zh": "霧中溫泉旅舍"},
        "logline": "A fog hot-spring inn: stone lanterns, steam, evening softened.",
        "comics": [
            {"en": "Stone lanterns invent a path.", "zh": "石燈籠發明小路。"},
            {"en": "Steam edits the edges of the world.", "zh": "蒸汽改寫世界的邊緣。"},
            {"en": "Wooden corridors remember wet feet.", "zh": "木廊記得濕腳步。"},
            {"en": "Fog keeps every goodbye unfinished.", "zh": "霧讓每句再見都不完整。"},
        ],
    },
    8: {
        "slug": "midnight-old-cinema",
        "title": {"en": "Midnight Old Cinema", "zh": "午夜舊戲院"},
        "logline": "A midnight old cinema after the last screening: empty seats still warm.",
        "comics": [
            {"en": "Empty aisle seats keep a faint heat.", "zh": "空座還留一點溫度。"},
            {"en": "The screen goes blank, not empty.", "zh": "銀幕空白，卻不空虛。"},
            {"en": "Projector dust floats like slow snow.", "zh": "放映機塵像慢雪。"},
            {"en": "Credits ended; the room continues.", "zh": "字幕結束，房間還在。"},
        ],
    },
    9: {
        "slug": "night-express",
        "title": {"en": "Night Express", "zh": "夜行列車"},
        "logline": "One overnight sleeper-train love story in twenty quiet fragments.",
        "comics": [
            {"en": "Platform mist holds the departure.", "zh": "月台霧氣握住離站。"},
            {"en": "Window glass doubles every light.", "zh": "車窗把燈影疊成兩層。"},
            {"en": "The corridor keeps careful footsteps.", "zh": "走道記得小心的腳步。"},
            {"en": "Morning arrives as a softer station.", "zh": "早晨像一座更軟的站。"},
        ],
    },
    10: {
        "slug": "elevator-between-floors",
        "title": {"en": "Elevator Between Floors", "zh": "停在半層的電梯"},
        "logline": "An old-building elevator malfunctions overnight between floors.",
        "comics": [
            {"en": "The door opens halfway, then thinks.", "zh": "門開一半，又開始想。"},
            {"en": "Floor numbers blink without landing.", "zh": "樓層數字閃，卻不落地。"},
            {"en": "An unclaimed umbrella waits politely.", "zh": "一把無主的傘客氣地等。"},
            {"en": "Between floors, time loosens.", "zh": "半層之間，時間鬆了。"},
        ],
    },
    11: {
        "slug": "autumn-river-overlook",
        "title": {"en": "Autumn River Overlook", "zh": "秋江遠望"},
        "logline": "傳聞追不到江邊。遠山還在，心卻輕了。",
        "comics": [
            {"en": "Reed wind softens the city behind you.", "zh": "蘆葦風把城聲擦淡。"},
            {"en": "A sail too small to carry an argument.", "zh": "遠帆小到裝不下爭吵。"},
            {"en": "Sit until the sunset lowers itself.", "zh": "坐下，直到夕陽自己變矮。"},
            {"en": "One lamp is enough to keep the night honest.", "zh": "一點漁火，夜就誠實了。"},
        ],
        "hero": "assets/ep11-autumn-river-hero.png",
        "comicImages": [
            "assets/ep11-comic-01.png",
            "assets/ep11-comic-02.png",
            "assets/ep11-comic-03.png",
            "assets/ep11-comic-04.png",
        ],
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
    """Return ordered list of {start,time,en,zh} from description tracklist."""
    rows = []
    # Prefer TRACKLIST section if present
    section = description
    m = re.search(r"TRACKLIST\s*\n([\s\S]*?)(?:\n------|\nPOETRY|\n#|\Z)", description)
    if m:
        section = m.group(1)
    pattern = re.compile(r"(?m)^((?:\d+:)?\d+:\d+)\s+(.+?)\s*·\s*(.+?)\s*$")
    for hit in pattern.finditer(section):
        time_s, en, zh = hit.group(1), hit.group(2).strip(), hit.group(3).strip()
        # skip poetry dumps that accidentally match
        if en.lower().startswith("http"):
            continue
        rows.append(
            {
                "start": parse_time(time_s),
                "time": time_s,
                "en": en,
                "zh": zh,
            }
        )
    # Deduplicate while preserving order (poetry section may repeat)
    seen = set()
    out = []
    for r in rows:
        key = (r["start"], r["en"].lower())
        if key in seen:
            continue
        seen.add(key)
        out.append(r)
    return out


def parse_prompt(path: Path, source_prefix: str | None = None) -> dict:
    text = path.read_text(encoding="utf-8")
    n = path.name.split("-", 1)[0]
    title_m = re.search(r"^#\s+\d+\s+[—-]\s+(.+)$", text, re.M)
    title = title_m.group(1).strip() if title_m else path.stem
    if "·" in title:
        en, zh = [x.strip() for x in title.split("·", 1)]
    else:
        en, zh = title, ""
    voice_m = re.search(r"\*\*Voice:\*\*\s*(.+)", text)
    lyrics_m = re.search(r"\*\*Lyrics\*\*\s*\n```\n([\s\S]*?)\n```", text)
    if not lyrics_m:
        lyrics_m = re.search(r"\*\*Lyrics\*\*\s*\n```([\s\S]*?)```", text)
    if not lyrics_m:
        raise ValueError(f"No Lyrics block in {path}")
    if source_prefix:
        source = f"{source_prefix}/{path.name}"
    elif path.parent.name.startswith("episode-"):
        source = f"songs/prompts/{path.parent.name}/{path.name}"
    else:
        source = f"songs/prompts/{path.name}"
    return {
        "n": n.zfill(2) if n.isdigit() else n,
        "en": en,
        "zh": zh,
        "voice": voice_m.group(1).strip() if voice_m else "",
        "lyrics": lyrics_m.group(1).strip("\n"),
        "source": source,
    }


def index_prompts(prompts: list[dict]) -> tuple[dict[str, dict], dict[str, dict]]:
    by_en = {p["en"].lower(): p for p in prompts}
    by_zh = {p["zh"]: p for p in prompts if p.get("zh")}
    return by_en, by_zh


def load_prompts(ep: int) -> list[dict]:
    if ep == 1:
        root = N20DLE / "songs/prompts"
        paths = [root / name for name in EP01_PROMPT_FILES]
        missing = [str(p) for p in paths if not p.exists()]
        if missing:
            raise FileNotFoundError("Missing Ep01 prompts:\n" + "\n".join(missing))
        return [parse_prompt(p, source_prefix="songs/prompts") for p in paths]
    prompt_dir = N20DLE / f"songs/prompts/episode-{ep:02d}"
    if not prompt_dir.exists():
        raise FileNotFoundError(prompt_dir)
    return [parse_prompt(p) for p in sorted(prompt_dir.glob("*.md"))]


def pick_youtube_json(ep: int) -> Path:
    folder = N20DLE / f"video/outputs/episode-{ep:02d}"
    preferred = folder / f"episode-{ep:02d}-quietly-10songs.youtube.json"
    if ep == 1 and preferred.exists():
        return preferred
    mains = sorted(folder.glob(f"episode-{ep:02d}-quietly-*.youtube.json"))
    if mains:
        return mains[0]
    yt_files = sorted(folder.glob("*.youtube.json"))
    if not yt_files:
        raise FileNotFoundError(f"No youtube json for ep {ep}")
    return yt_files[0]


def build_episode(ep: int, video_ids: dict[int, str]) -> dict:
    yt_path = pick_youtube_json(ep)
    yt = json.loads(yt_path.read_text(encoding="utf-8"))
    stamps = extract_timestamps(yt.get("description", ""))
    prompts = load_prompts(ep)
    by_en, by_zh = index_prompts(prompts)

    tracks = []
    used_sources = set()
    missing_lyrics = []

    if stamps:
        for i, stamp in enumerate(stamps):
            p = by_en.get(stamp["en"].lower()) or by_zh.get(stamp["zh"])
            if not p:
                missing_lyrics.append(stamp["en"])
                continue
            used_sources.add(p["source"])
            tracks.append(
                {
                    "n": str(i + 1).zfill(2),
                    "start": stamp["start"],
                    "time": stamp["time"],
                    "en": p["en"],
                    "zh": p["zh"] or stamp.get("zh", ""),
                    "voice": p["voice"],
                    "lyrics": p["lyrics"],
                    "source": p["source"],
                }
            )
    else:
        for i, p in enumerate(prompts):
            tracks.append(
                {
                    "n": p["n"],
                    "start": i * 180,
                    "time": f"{(i * 180) // 60}:{(i * 180) % 60:02d}",
                    "en": p["en"],
                    "zh": p["zh"],
                    "voice": p["voice"],
                    "lyrics": p["lyrics"],
                    "source": p["source"],
                }
            )

    unpublished = [p["en"] for p in prompts if p["source"] not in used_sources]
    unmatched = missing_lyrics + (
        [f"unpublished:{u}" for u in unpublished] if unpublished else []
    )

    meta = EPISODE_META[ep]
    lyrics_source = (
        "songs/prompts/{01-10}-*.md (Ep01 flat prompts)"
        if ep == 1
        else f"songs/prompts/episode-{ep:02d}/*.md"
    )
    return {
        "episode": ep,
        "slug": meta["slug"],
        "title": meta["title"],
        "logline": meta["logline"],
        "videoId": video_ids.get(ep) or VIDEO_IDS.get(ep) or "",
        "youtubeTitle": yt.get("title", ""),
        "comics": meta["comics"],
        "hero": meta.get("hero", ""),
        "comicImages": meta.get("comicImages", []),
        "tracks": tracks,
        "warnings": unmatched,
        "lyricsSource": lyrics_source,
    }


def main() -> None:
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    video_ids_path = OUT_DIR / "video-ids.json"
    video_ids = dict(VIDEO_IDS)
    if video_ids_path.exists():
        video_ids.update(
            {int(k): v for k, v in json.loads(video_ids_path.read_text(encoding="utf-8")).items()}
        )

    index = []
    for ep in range(1, 12):
        data = build_episode(ep, video_ids)
        out = OUT_DIR / f"episode-{ep:02d}.json"
        out.write_text(json.dumps(data, ensure_ascii=False, indent=2), encoding="utf-8")
        index.append(
            {
                "episode": ep,
                "slug": data["slug"],
                "title": data["title"],
                "logline": data["logline"],
                "trackCount": len(data["tracks"]),
                "videoId": data["videoId"],
                "href": f"worlds/{data['slug']}.html",
                "hasHero": bool(data.get("hero")),
                "warnings": data.get("warnings", []),
            }
        )
        warn = f" warnings={data['warnings']}" if data["warnings"] else ""
        print(
            f"Ep{ep:02d} tracks={len(data['tracks'])} videoId={data['videoId'] or '-'}{warn}"
        )

    (OUT_DIR / "episodes-index.json").write_text(
        json.dumps(index, ensure_ascii=False, indent=2), encoding="utf-8"
    )
    print(f"wrote index -> {OUT_DIR / 'episodes-index.json'}")


if __name__ == "__main__":
    main()
