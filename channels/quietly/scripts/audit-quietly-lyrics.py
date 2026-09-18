"""Audit QuietLY episode lyrics against quietly-ch-jazz-production prompts.

- Fills empty lyrics (notably episodes 12–15)
- Reports mismatches / missing prompt matches
- Leaves non-empty matching lyrics unchanged

Usage:
  N20DLE=/path/to/quietly-ch-jazz-production \\
    python channels/quietly/scripts/audit-quietly-lyrics.py
  N20DLE=... python channels/quietly/scripts/audit-quietly-lyrics.py --write
"""

from __future__ import annotations

import argparse
import json
import os
import re
from pathlib import Path

CHANNEL_ROOT = Path(__file__).resolve().parents[1]
DATA = CHANNEL_ROOT / "data"
N20DLE = Path(os.environ.get("N20DLE", "/tmp/quietly-ch"))

# Prefer published mix when both exist
YT_PREFERRED = {
    13: "episode-13-quietly-20songs.youtube.json",
    17: "episode-17-quietly-19songs.youtube.json",
}

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


def parse_prompt(path: Path, source: str) -> dict:
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
        raise ValueError(f"No Lyrics in {path}")
    return {
        "n": n.zfill(2) if n.isdigit() else n,
        "en": en,
        "zh": zh,
        "voice": voice_m.group(1).strip() if voice_m else "",
        "lyrics": lyrics_m.group(1).strip("\n"),
        "source": source,
    }


def load_prompts(ep: int) -> list[dict]:
    if ep == 1:
        root = N20DLE / "songs/prompts"
        return [
            parse_prompt(root / name, f"songs/prompts/{name}")
            for name in EP01_PROMPT_FILES
            if (root / name).exists()
        ]
    d = N20DLE / f"songs/prompts/episode-{ep:02d}"
    if not d.exists():
        return []
    return [
        parse_prompt(p, f"songs/prompts/episode-{ep:02d}/{p.name}")
        for p in sorted(d.glob("*.md"))
    ]


def index_prompts(prompts: list[dict]):
    by_en, by_zh = {}, {}
    for p in prompts:
        if p.get("en"):
            by_en[p["en"].lower()] = p
        if p.get("zh"):
            by_zh[p["zh"]] = p
            by_en.setdefault(p["zh"].lower(), p)
        if p.get("en"):
            by_zh.setdefault(p["en"], p)
    return by_en, by_zh


def match_prompt(en: str, zh: str, by_en, by_zh):
    return (
        by_en.get((en or "").lower())
        or by_zh.get(zh or "")
        or by_en.get((zh or "").lower())
        or by_zh.get(en or "")
    )


def normalize_pair(left: str, right: str) -> tuple[str, str]:
    if cjk_count(left) > cjk_count(right):
        return right, left
    return left, right


def pick_youtube(ep: int) -> Path | None:
    folder = N20DLE / f"video/outputs/episode-{ep:02d}"
    if not folder.exists():
        return None
    preferred = YT_PREFERRED.get(ep)
    if preferred and (folder / preferred).exists():
        return folder / preferred
    mains = sorted(folder.glob(f"episode-{ep:02d}-quietly-*.youtube.json"))
    if mains:
        # Prefer *20songs* then *19songs* then first
        for needle in ("20songs", "19songs", "10songs"):
            for p in mains:
                if needle in p.name:
                    return p
        return mains[0]
    files = sorted(folder.glob("*.youtube.json"))
    return files[0] if files else None


def audit_episode(ep: int, write: bool) -> dict:
    path = DATA / f"episode-{ep:02d}.json"
    data = json.loads(path.read_text(encoding="utf-8"))
    prompts = load_prompts(ep)
    by_en, by_zh = index_prompts(prompts)
    report = {
        "episode": ep,
        "tracks": len(data.get("tracks") or []),
        "prompts": len(prompts),
        "filled": 0,
        "matched_ok": 0,
        "mismatched": [],
        "unmatched": [],
        "empty_after": 0,
    }

    # Prefer rebuilding lyrics from YT chapter order when available
    yt_path = pick_youtube(ep)
    stamps = []
    if yt_path:
        yt = json.loads(yt_path.read_text(encoding="utf-8"))
        stamps = extract_timestamps(yt.get("description", ""))

    changed = False
    tracks = data.get("tracks") or []

    if stamps and prompts:
        new_tracks = []
        used = set()
        for i, stamp in enumerate(stamps):
            en, zh = normalize_pair(stamp["left"], stamp["right"])
            p = match_prompt(en, zh, by_en, by_zh)
            if not p:
                report["unmatched"].append(f"{stamp['time']} {stamp['left']} · {stamp['right']}")
                # keep existing slot if present
                if i < len(tracks):
                    new_tracks.append(tracks[i])
                continue
            used.add(p["source"])
            existing = tracks[i] if i < len(tracks) else {}
            lyrics = p["lyrics"]
            old = (existing.get("lyrics") or "").strip("\n")
            if old and old != lyrics:
                report["mismatched"].append(
                    {
                        "n": str(i + 1).zfill(2),
                        "title": f"{p['en']} · {p['zh']}",
                        "site_len": len(old),
                        "prompt_len": len(lyrics),
                    }
                )
                if write:
                    report["filled"] += 1
            elif old == lyrics:
                report["matched_ok"] += 1
            elif write:
                report["filled"] += 1

            out_lyrics = lyrics if write else (old or "")
            if not write and not old:
                report["empty_after"] += 1

            new_tracks.append(
                {
                    "n": str(i + 1).zfill(2),
                    "start": stamp["start"],
                    "time": stamp["time"],
                    "en": p["en"] or en,
                    "zh": p["zh"] or zh,
                    "voice": p.get("voice") or existing.get("voice") or "",
                    "lyrics": out_lyrics if out_lyrics or not write else lyrics,
                    "source": p["source"],
                }
            )
            if write:
                new_tracks[-1]["lyrics"] = lyrics

        # unpublished prompts
        for p in prompts:
            if p["source"] not in used:
                report.setdefault("unpublished", []).append(p["en"] or p["zh"])

        if write and new_tracks:
            data["tracks"] = new_tracks
            data["warnings"] = [
                f"unpublished:{u}" for u in report.get("unpublished", [])
            ] + [f"unmatched:{u}" for u in report["unmatched"]]
            data["lyricsSource"] = (
                "songs/prompts/{01-10}-*.md"
                if ep == 1
                else f"songs/prompts/episode-{ep:02d}/*.md"
            )
            changed = True
    else:
        # No YT stamps — fill by title match only
        for t in tracks:
            p = match_prompt(t.get("en", ""), t.get("zh", ""), by_en, by_zh)
            if not p:
                report["unmatched"].append(f"{t.get('n')} {t.get('en')} · {t.get('zh')}")
                if not (t.get("lyrics") or "").strip():
                    report["empty_after"] += 1
                continue
            old = (t.get("lyrics") or "").strip("\n")
            if old == p["lyrics"]:
                report["matched_ok"] += 1
            elif old and old != p["lyrics"]:
                report["mismatched"].append(
                    {
                        "n": t.get("n"),
                        "title": f"{t.get('en')} · {t.get('zh')}",
                        "site_len": len(old),
                        "prompt_len": len(p["lyrics"]),
                    }
                )
                if write:
                    t["lyrics"] = p["lyrics"]
                    t["source"] = p["source"]
                    report["filled"] += 1
                    changed = True
            else:
                if write:
                    t["lyrics"] = p["lyrics"]
                    t["source"] = p["source"]
                    report["filled"] += 1
                    changed = True
                else:
                    report["empty_after"] += 1

    if write and changed:
        path.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    # recount empties
    tracks = json.loads(path.read_text(encoding="utf-8")).get("tracks") or []
    report["empty_after"] = sum(1 for t in tracks if not (t.get("lyrics") or "").strip())
    report["tracks"] = len(tracks)
    return report


def main() -> None:
    ap = argparse.ArgumentParser()
    ap.add_argument("--write", action="store_true")
    ap.add_argument("--episodes", default="1-18")
    args = ap.parse_args()
    lo, hi = [int(x) for x in args.episodes.split("-", 1)]
    print(f"N20DLE={N20DLE} write={args.write} episodes={lo}-{hi}")
    summary = []
    for ep in range(lo, hi + 1):
        if not (DATA / f"episode-{ep:02d}.json").exists():
            print(f"Ep{ep:02d} SKIP missing json")
            continue
        r = audit_episode(ep, write=args.write)
        summary.append(r)
        mis = len(r["mismatched"])
        unm = len(r["unmatched"])
        print(
            f"Ep{ep:02d} tracks={r['tracks']} prompts={r['prompts']} "
            f"ok={r['matched_ok']} filled/fixed={r['filled']} "
            f"mismatch={mis} unmatched={unm} empty={r['empty_after']}"
        )
        for m in r["mismatched"][:5]:
            print(f"  mismatch {m['n']} {m['title']} site={m['site_len']} prompt={m['prompt_len']}")
        for u in r["unmatched"][:5]:
            print(f"  unmatched {u}")

    empty_eps = [r["episode"] for r in summary if r["empty_after"]]
    bad = [r["episode"] for r in summary if r["mismatched"] or r["unmatched"]]
    print("---")
    print(f"episodes_with_empty_lyrics={empty_eps or 'none'}")
    print(f"episodes_with_issues={bad or 'none'}")


if __name__ == "__main__":
    main()
