#!/usr/bin/env python3
"""Generate Café Siam on-site room pages from the jpth template + room config."""

from __future__ import annotations

import shutil
import sys
from pathlib import Path

SIAM_ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(SIAM_ROOT / "_shared"))

from rooms import ROOMS, Room  # noqa: E402

JPTH = SIAM_ROOT / "jpth"
NEW_ROOMS = ("enthp", "thenth", "enjp", "thchi")


def replace_all(text: str, room: Room) -> str:
    lede_old = (
        "          Japanese × Thai songs — diction-first duets with romanized Thai\n"
        "          after every line. Open a row for the lyric sheet, or let Atmosphere\n"
        "          autoplay the room."
    )
    lede_new = (
        f"          {room.pair_label} songs — diction-first duets"
        + (
            " with romanized Thai\n          after every line."
            if room.has_thai_roman
            else " for clear bilingual listening."
        )
        + " Open a row for the lyric sheet, or let Atmosphere\n          autoplay the room."
    )
    text = text.replace(lede_old, lede_new)
    text = text.replace("          <dd>146 songs and counting</dd>", "          <dd>Songs and counting</dd>")

    # Long phrases first — before pair_label substitutions mutate the source text.
    about_intro = f"About Café Siam: an {room.pair_label} listening café from n20dle"
    if room.pair_label.startswith("English") or room.pair_label.startswith("Thai"):
        about_intro = f"About Café Siam: a {room.pair_label} listening café from n20dle"
    if room.pair_label.startswith("中文"):
        about_intro = f"About Café Siam: a {room.pair_label} listening café from n20dle"
    text = text.replace(
        "About Café Siam: a Japanese × Thai listening café from n20dle — diction-first bilingual songs, romanized Thai after every line.",
        f"{about_intro} — diction-first bilingual songs"
        + (", romanized Thai after every line." if room.has_thai_roman else "."),
    )
    text = text.replace(
        "Soft songs that teach themselves — Japanese × Thai, with romanized Thai\n        after every line.",
        f"Soft songs that teach themselves — {room.pair_label}"
        + (", with romanized Thai\n        after every line." if room.has_thai_roman else "."),
    )
    text = text.replace(
        "Each song is diction-first: a male–female duet trades the same line in\n          Japanese and Thai, with romanized Thai printed after every phrase so\n          you can follow by ear.",
        f"Each song is diction-first: a male–female duet trades the same line in\n          {room.pair_label.replace(' × ', ' and ')},"
        + (
            " with romanized Thai printed after every phrase so\n          you can follow by ear."
            if room.has_thai_roman
            else " so you can follow by ear."
        ),
    )
    text = text.replace(
        "Café Siam Atmosphere: soft music plays itself while Japanese × Thai lyrics stay open for listening and learning.",
        f"Café Siam Atmosphere: soft music plays itself while {room.pair_label} "
        "lyrics stay open for listening and learning.",
    )
    text = text.replace(
        "Browse Café Siam Japanese × Thai songs and open Atmosphere for auto listening practice.",
        f"Browse Café Siam {room.pair_label} songs and open Atmosphere for auto "
        "listening practice.",
    )
    text = text.replace(
        "Café Siam is the Japanese × Thai room of <strong>n20dle</strong>, a\n          small bilingual-learning song factory.",
        f"Café Siam is the {room.pair_label} room of <strong>n20dle</strong>, a\n          small bilingual-learning song factory.",
    )
    text = text.replace(
        "Soft music autoplays. Japanese × Thai lyric sheets stay open—no\n          karaoke chase, just listening practice with a little fun between\n          songs.",
        room.gate_blurb,
    )

    mapping = {
        "JP × TH": room.pair_short,
        "Japanese × Thai": room.pair_label,
        "JP×TH": room.pair_short.replace(" ", ""),
        "jpth": room.product,
        "siam/jpth": room.slug,
        "@cafesiamsoftmusicthaijapanese": room.handle,
        "https://www.youtube.com/@cafesiamsoftmusicthaijapanese": (
            f"https://www.youtube.com/{room.handle}"
        ),
        "n20dle delicetta": f"n20dle {room.brand}",
        "delicetta": room.brand,
        "Japanese — Thai (romanized). Sit with the line while the café plays.": room.learn_hint,
        "Japanese — Thai <span class=\"th\">（日→泰）</span>": room.pair_short,
        "Search Japanese, Thai, or lyric lines…": room.search_placeholder,
        '<span class="atm-gate__mark" aria-hidden="true">シ</span>': (
            f'<span class="atm-gate__mark" aria-hidden="true">{room.gate_mark}</span>'
        ),
        " · Atmosphere · Cafe' Siam JP × TH": f" · Atmosphere · Cafe' Siam {room.pair_short}",
        " · Cafe' Siam JP × TH": f" · Cafe' Siam {room.pair_short}",
    }
    for old, new in mapping.items():
        text = text.replace(old, new)
    return text


def write_room(room: Room) -> None:
    dest = SIAM_ROOT / room.product
    if dest.exists():
        shutil.rmtree(dest)
    shutil.copytree(JPTH, dest)

    css_old = dest / "css" / "jpth.css"
    css_new = dest / "css" / f"{room.product}.css"
    css_old.rename(css_new)

    for html_path in dest.glob("*.html"):
        text = html_path.read_text(encoding="utf-8")
        text = replace_all(text, room)
        text = text.replace("css/jpth.css", f"css/{room.product}.css")
        html_path.write_text(text, encoding="utf-8")

    for js_path in (dest / "js").glob("*.js"):
        text = js_path.read_text(encoding="utf-8")
        text = replace_all(text, room)
        js_path.write_text(text, encoding="utf-8")

    scripts_dir = dest / "scripts"
    if scripts_dir.exists():
        shutil.rmtree(scripts_dir)

    print(f"Generated {dest}")


def main() -> None:
    for product in NEW_ROOMS:
        write_room(ROOMS[product])


if __name__ == "__main__":
    main()
