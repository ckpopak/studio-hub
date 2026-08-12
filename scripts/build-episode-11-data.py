import json
import re
from pathlib import Path

root = Path(r"D:\_home\private\n20dle")
prompt_dir = root / "songs/prompts/episode-11"
yt = json.loads(
    (root / "video/outputs/episode-11/episode-11-quietly-20songs.youtube.json").read_text(
        encoding="utf-8"
    )
)
desc = yt["description"]

starts = {}
for m in re.finditer(r"(?m)^((?:\d+:)?\d+:\d+)\s+(.+?)\s*·\s*(.+)$", desc):
    t, en, zh = m.group(1), m.group(2).strip(), m.group(3).strip()
    parts = [int(x) for x in t.split(":")]
    if len(parts) == 2:
        sec = parts[0] * 60 + parts[1]
    else:
        sec = parts[0] * 3600 + parts[1] * 60 + parts[2]
    starts[en.lower()] = {"start": sec, "en": en, "zh": zh, "time": t}

tracks = []
for f in sorted(prompt_dir.glob("*.md")):
    text = f.read_text(encoding="utf-8")
    n = f.name.split("-", 1)[0]
    title_m = re.search(r"^#\s+\d+\s+—\s+(.+)$", text, re.M)
    title = title_m.group(1).strip() if title_m else f.stem
    if "·" in title:
        en, zh = [x.strip() for x in title.split("·", 1)]
    else:
        en, zh = title, ""
    voice_m = re.search(r"\*\*Voice:\*\*\s*(.+)", text)
    lyrics_m = re.search(r"\*\*Lyrics\*\*\s*\n```\n([\s\S]*?)\n```", text)
    if not lyrics_m:
        raise SystemExit(f"No lyrics in {f}")
    lyrics = lyrics_m.group(1).strip("\n")
    key = en.lower()
    if key not in starts:
        hit = next(
            (
                v
                for k, v in starts.items()
                if k.startswith(en.lower()[:12]) or en.lower().startswith(k[:12])
            ),
            None,
        )
        if not hit:
            raise SystemExit(f"No timestamp for {en}")
        meta = hit
    else:
        meta = starts[key]
    tracks.append(
        {
            "n": n,
            "start": meta["start"],
            "time": meta["time"],
            "en": en,
            "zh": zh or meta["zh"],
            "voice": voice_m.group(1).strip() if voice_m else "",
            "lyrics": lyrics,
            "source": f"songs/prompts/episode-11/{f.name}",
        }
    )

out = {
    "episode": 11,
    "slug": "autumn-river-overlook",
    "title": {"en": "Autumn River Overlook", "zh": "秋江遠望"},
    "videoId": "Iq842POdO2c",
    "youtubeTitle": yt["title"],
    "logline": "傳聞追不到江邊。遠山還在，心卻輕了。",
    "tracks": tracks,
}
out_path = Path(r"D:\_home\private\ricenation\data\episode-11.json")
out_path.parent.mkdir(parents=True, exist_ok=True)
out_path.write_text(json.dumps(out, ensure_ascii=False, indent=2), encoding="utf-8")
print(f"wrote {out_path} tracks={len(tracks)}")
for t in tracks:
    print(f"{t['n']} {t['time']:>7} {t['en']} · {t['zh']}")
