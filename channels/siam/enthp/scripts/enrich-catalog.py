#!/usr/bin/env python3
"""Enrich Café Siam EN×TH catalog: structured lyrics, romanization, taxonomy."""

from __future__ import annotations

import json
import re
from collections import Counter
from pathlib import Path

from pythainlp.tokenize import word_tokenize
from pythainlp.transliterate import romanize as thai_romanize

ROOT = Path(__file__).resolve().parents[1]
SRC = ROOT / "data" / "songs.json"
TAX = ROOT / "data" / "taxonomy.json"

VOICE_RE = re.compile(r"^\[(Female|Male|Male & Female|Both|Duet)\]\s*", re.I)
SECTION_RE = re.compile(r"^\[([^\]]+)\]\s*$")
# EN — TH (roman)   or   EN — TH
LINE_EN_TH_ROM = re.compile(
    r"^(?P<en>.+?)\s*[—–\-]\s*(?P<thai>.*?[\u0E00-\u0E7F][^\(]*?)"
    r"(?:\s*\((?P<roman>[^)]+)\))?\s*$"
)
# TH (roman) — EN
LINE_TH_EN_ROM = re.compile(
    r"^(?P<thai>.*?[\u0E00-\u0E7F].*?)\s*(?:\((?P<roman>[^)]+)\))?\s*[—–\-]\s*(?P<en>.+)$"
)
HAS_THAI = re.compile(r"[\u0E00-\u0E7F]")
HAS_LATIN = re.compile(r"[A-Za-z]")
SKIP_LINE = re.compile(
    r"^(?:#|How this was made|Made with AI|Sounds or visuals|Learn more|——|---)",
    re.I,
)

INSTRUMENT_HINTS = (
    "guitar",
    "bass",
    "drums",
    "piano",
    "keys",
    "rhodes",
    "nylon",
    "brush",
    "cello",
    "fade",
    "humming",
    "no human",
    "no spoken",
    "no instruments",
    "lyric sheet",
    "pure vocals",
    "quiet room",
    "human hum",
    "instrumental",
    "khim",
    "upright",
    "cinematic",
    "optional",
    "electric piano",
    "soft clean",
    "gentle drums",
    "warm keys",
    "finger bass",
    "clean guitar",
    "a cappella",
    "acapella",
    "very slow",
    "sung narration",
    "clear and gentle",
    "very clear",
)

CATEGORY_RULES: list[tuple[str, str, tuple[str, ...]]] = [
    (
        "home-belonging",
        "Home & belonging",
        ("home", "bangkok", "กรุงเทพ", "บ้าน", "belong", "stay", "neighbor", "condo"),
    ),
    (
        "city-street",
        "City & streets",
        ("street", "city", "commute", "company", "elevator", "scooter", "station", "ถนน", "เมือง", "directions"),
    ),
    (
        "cafe-soft-day",
        "Café & soft days",
        ("café", "cafe", "soft day", "sit", "sip", "tea", "coffee", "เบาๆ", "นั่ง", "wifi"),
    ),
    (
        "work-daily",
        "Work & daily tasks",
        ("work", "meeting", "office", "appointment", "pharmacy", "bank", "atm", "parcel", "grocery", "wifi"),
    ),
    (
        "time-days",
        "Time & days",
        ("every day", "yesterday", "tomorrow", "ทุกวัน", "เมื่อวาน", "พรุ่งนี้", "morning"),
    ),
    (
        "feelings-heart",
        "Feelings & heart",
        ("heart", "rich", "lazy", "dream", "courage", "ใจ", "ฝัน", "ขี้เกียจ", "love", "smile", "mist"),
    ),
    (
        "learning-language",
        "Learning language",
        ("alphabet", "learn", "phrase", "5w1h", "headline", "words", "เรียน", "ภาษา", "who", "what"),
    ),
    (
        "caution-scam",
        "Caution & scams",
        ("invest", "dark", "scam", "money", "ลงทุน", "ความมืด", "fine print"),
    ),
    (
        "story-mystery",
        "Story & mystery",
        ("mystery", "case", "shadow", "คดี", "ปริศนา", "headline"),
    ),
    (
        "playful",
        "Playful & pop",
        ("mario", "cat", "jump", "machine", "bb", "shizuka", "spiderman", "แมว"),
    ),
    (
        "blessings",
        "Blessings & wishes",
        ("blessing", "อวยพร", "wish", "eight", "peace"),
    ),
]


def clean_roman(s: str) -> str:
    return re.sub(r"\s+", " ", (s or "").strip())


def auto_roman(thai: str) -> str:
    thai = (thai or "").strip()
    if not thai or not HAS_THAI.search(thai):
        return ""
    try:
        parts = []
        for w in word_tokenize(thai, keep_whitespace=False):
            w = w.strip()
            if not w or not HAS_THAI.search(w):
                if w and HAS_LATIN.search(w):
                    parts.append(w.lower())
                continue
            parts.append(thai_romanize(w))
        return clean_roman(" ".join(parts))
    except Exception:
        try:
            return clean_roman(thai_romanize(thai))
        except Exception:
            return ""


def is_section_label(label: str) -> bool:
    low = label.lower()
    if any(h in low for h in INSTRUMENT_HINTS):
        return False
    return True


def parse_lyrics(raw: str) -> list[dict]:
    """Parse EN×TH production lyrics into structured rows."""
    lines_out: list[dict] = []
    section = ""
    pending_en: dict | None = None  # for alternating Eng / Thai lines

    def flush_pending():
        nonlocal pending_en
        if pending_en:
            lines_out.append(pending_en)
            pending_en = None

    for raw_line in (raw or "").splitlines():
        line = raw_line.strip()
        if not line or SKIP_LINE.match(line):
            continue

        sm = SECTION_RE.match(line)
        if sm:
            flush_pending()
            label = sm.group(1).strip()
            if not is_section_label(label):
                continue
            # Voice-only tags are not sections
            if re.fullmatch(r"(Female|Male|Male & Female|Both|Duet)", label, re.I):
                # keep as voice for next line via a tiny state? handled when on same flow —
                # store as voice marker by setting a sticky voice
                lines_out.append({"type": "voice", "voice": label})
                continue
            section = label
            lines_out.append({"type": "section", "label": section})
            continue

        voice = ""
        vm = VOICE_RE.match(line)
        if vm:
            voice = vm.group(1)
            line = line[vm.end() :].strip()
            if not line:
                lines_out.append({"type": "voice", "voice": voice})
                continue

        # Sticky voice from previous voice-only marker
        if not voice and lines_out and lines_out[-1].get("type") == "voice":
            voice = lines_out[-1].get("voice") or ""
            lines_out.pop()

        thai = roman = en = ""

        # Prefer EN — TH (roman) for this channel
        m = LINE_EN_TH_ROM.match(line)
        if m and HAS_THAI.search(m.group("thai") or ""):
            en = m.group("en").strip()
            thai = m.group("thai").strip(" —–-")
            roman = clean_roman(m.group("roman") or "")
            # If en part accidentally includes Thai, fall through
            if HAS_THAI.search(en) and not HAS_LATIN.search(en):
                m = None
        else:
            m = None

        if not m:
            m2 = LINE_TH_EN_ROM.match(line)
            if m2 and HAS_THAI.search(m2.group("thai") or ""):
                thai = m2.group("thai").strip()
                roman = clean_roman(m2.group("roman") or "")
                en = m2.group("en").strip()
                m = m2

        if m:
            flush_pending()
            if thai and not roman:
                roman = auto_roman(thai)
                roman_source = "pythainlp"
            else:
                roman_source = "lyric" if roman else ""
            lines_out.append(
                {
                    "type": "line",
                    "thai": thai,
                    "roman": roman,
                    "en": en,
                    "voice": voice,
                    "section": section,
                    "roman_source": roman_source,
                }
            )
            continue

        # Alternating monolingual lines (Part A Eng / Part B Thai style)
        if HAS_THAI.search(line) and not HAS_LATIN.search(line):
            thai = line
            roman = auto_roman(thai)
            if pending_en:
                pending_en["thai"] = thai
                pending_en["roman"] = roman
                pending_en["roman_source"] = "pythainlp" if roman else ""
                if voice and not pending_en.get("voice"):
                    pending_en["voice"] = voice
                lines_out.append(pending_en)
                pending_en = None
            else:
                lines_out.append(
                    {
                        "type": "line",
                        "thai": thai,
                        "roman": roman,
                        "en": "",
                        "voice": voice,
                        "section": section,
                        "roman_source": "pythainlp" if roman else "",
                    }
                )
            continue

        if HAS_LATIN.search(line) and not HAS_THAI.search(line):
            flush_pending()
            pending_en = {
                "type": "line",
                "thai": "",
                "roman": "",
                "en": line,
                "voice": voice,
                "section": section,
                "roman_source": "",
            }
            continue

        flush_pending()
        if line.startswith("[") and line.endswith("]"):
            continue
        lines_out.append(
            {"type": "note", "text": line, "voice": voice, "section": section}
        )

    flush_pending()
    return lines_out


def score_difficulty(song: dict, structured: list[dict]) -> tuple[str, dict]:
    lyric_lines = [x for x in structured if x.get("type") == "line"]
    title = (song.get("title_core") or song.get("title") or "").lower()
    if any(k in title for k in ("alphabet", "ก ไก่", "5w1h", "ทุกวัน", "every day", "who —")):
        return "beginner", {"reason": "core-phrases"}
    if any(k in title for k in ("invest", "mystery", "headline", "ลงทุน", "คดี", "between the lines")):
        return "intermediate", {"reason": "dense-topic"}

    if not lyric_lines:
        return "elementary", {"reason": "no-lyrics"}

    lengths = [len(x.get("thai") or x.get("en") or "") for x in lyric_lines]
    avg = sum(lengths) / max(len(lengths), 1)
    unique_thai = len({x.get("thai") for x in lyric_lines if x.get("thai")})

    if avg <= 18 and unique_thai <= 30:
        level = "beginner"
    elif avg <= 36 and unique_thai <= 55:
        level = "elementary"
    else:
        level = "intermediate"
    return level, {"avg_chars": round(avg, 1), "unique_thai_lines": unique_thai}


def categorize(song: dict, structured: list[dict]) -> list[dict]:
    blob = " ".join(
        [
            song.get("title") or "",
            song.get("title_core") or "",
            song.get("title_jp") or "",
            song.get("title_th") or "",
            song.get("production_folder") or "",
            " ".join(
                (x.get("thai") or "") + " " + (x.get("en") or "")
                for x in structured
                if x.get("type") == "line"
            )[:1500],
        ]
    ).lower()
    hits = []
    for slug, label, needles in CATEGORY_RULES:
        score = sum(1 for n in needles if n.lower() in blob)
        if score:
            hits.append((score, slug, label))
    hits.sort(reverse=True)
    if not hits:
        return [{"id": "general", "label": "General listening"}]
    return [{"id": h[1], "label": h[2]} for h in hits[:2]]


def main() -> None:
    data = json.loads(SRC.read_text(encoding="utf-8"))
    songs = data["songs"]
    diff_counts: Counter[str] = Counter()
    cat_counts: Counter[str] = Counter()
    roman_line_count = 0
    lyric_song_count = 0

    for song in songs:
        structured = (
            parse_lyrics(song.get("lyrics") or "") if song.get("has_lyrics") else []
        )
        if structured:
            lyric_song_count += 1
            roman_line_count += sum(
                1 for x in structured if x.get("type") == "line" and x.get("roman")
            )

        level, meta = score_difficulty(song, structured)
        cats = categorize(song, structured)
        song["difficulty"] = level
        song["difficulty_meta"] = meta
        song["categories"] = cats
        song["lines"] = structured
        song["has_romanization"] = any(
            x.get("type") == "line" and x.get("roman") for x in structured
        )

        # EN×TH field names (legacy title_jp held English)
        song["title_en"] = song.get("title_jp") or song.get("title_en") or ""
        song["title_thai"] = song.get("title_th") or song.get("title_thai") or ""
        if not song["title_thai"] and HAS_THAI.search(song.get("title_core") or ""):
            core = song.get("title_core") or ""
            parts = re.split(r"\s*[×x]\s*", core, maxsplit=1)
            if len(parts) == 2:
                a, b = parts[0].strip(), parts[1].strip()
                if HAS_THAI.search(b):
                    song["title_en"], song["title_thai"] = a, b
                elif HAS_THAI.search(a):
                    song["title_thai"], song["title_en"] = a, b

        diff_counts[level] += 1
        for c in cats:
            cat_counts[c["id"]] += 1

    data["enriched_at"] = "2026-08-16"
    data["enrichment"] = {
        "songs_with_structured_lyrics": lyric_song_count,
        "romanized_lines": roman_line_count,
        "difficulty_counts": dict(diff_counts),
        "category_counts": dict(cat_counts),
    }
    SRC.write_text(json.dumps(data, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")

    taxonomy = {
        "channel": data.get("channel"),
        "handle": data.get("handle"),
        "pair_label": data.get("pair_label"),
        "facets": {
            "difficulty": [
                {"id": "beginner", "label": "Beginner", "blurb": "Short phrases, high repetition"},
                {"id": "elementary", "label": "Elementary", "blurb": "Everyday scenes, medium lines"},
                {
                    "id": "intermediate",
                    "label": "Intermediate",
                    "blurb": "Denser topics and longer lines",
                },
            ],
            "category": [{"id": s, "label": l} for s, l, _ in CATEGORY_RULES]
            + [{"id": "general", "label": "General listening"}],
            "lyrics": [
                {"id": "with-lyrics", "label": "Full lyrics sheet"},
                {"id": "with-roman", "label": "Has romanized Thai"},
                {"id": "pending", "label": "Lyrics pending"},
            ],
        },
        "counts": {
            "songs": len(songs),
            "difficulty": dict(diff_counts),
            "category": dict(cat_counts),
            "with_lyrics": lyric_song_count,
        },
    }
    TAX.write_text(json.dumps(taxonomy, ensure_ascii=False, indent=2) + "\n", encoding="utf-8")
    print(
        f"enriched {len(songs)}; structured={lyric_song_count}; "
        f"roman_lines={roman_line_count}; difficulty={dict(diff_counts)}"
    )


if __name__ == "__main__":
    main()
