"""Café Siam room definitions — cross-checked with lang-song-p25-production pairs."""

from __future__ import annotations

from dataclasses import dataclass


@dataclass(frozen=True)
class Room:
    slug: str
    product: str
    handle: str
    channel_id: str
    channel_name: str
    pair_label: str
    pair_short: str
    brand: str
    n20dle_suffix: str
    learn_hint: str
    gate_mark: str
    gate_blurb: str
    about_blurb: str
    atlas_lede: str
    search_placeholder: str
    has_thai_roman: bool = True
    font_link: str = (
        "https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1"
        "&family=Noto+Sans+Thai:wght@300;400;500"
        "&family=Noto+Serif+JP:wght@400;500;600"
        "&family=Noto+Serif+TC:wght@400;500"
        "&family=Outfit:wght@300;400;500&display=swap"
    )


ROOMS: dict[str, Room] = {
    "jpth": Room(
        slug="siam/jpth",
        product="jpth",
        handle="@cafesiamsoftmusicthaijapanese",
        channel_id="UClxFByUkmmVK-7endWpTmPA",
        channel_name="Cafe' Siam | Soft Music & Thai–Japanese Listening",
        pair_label="Japanese × Thai",
        pair_short="JP × TH",
        brand="delicetta",
        n20dle_suffix="thjp",
        learn_hint="Japanese — Thai (romanized). Sit with the line while the café plays.",
        gate_mark="シ",
        gate_blurb=(
            "Soft music autoplays. Japanese × Thai lyric sheets stay open—no "
            "karaoke chase, just listening practice with a little fun between songs."
        ),
        about_blurb=(
            "Café Siam is the Japanese × Thai room of n20dle, a small "
            "bilingual-learning song factory."
        ),
        atlas_lede=(
            "Japanese × Thai songs — diction-first duets with romanized Thai "
            "after every line. Open a row for the lyric sheet, or let Atmosphere "
            "autoplay the room."
        ),
        search_placeholder="Search Japanese, Thai, or lyric lines…",
    ),
    "enthp": Room(
        slug="siam/enthp",
        product="enthp",
        handle="@cafesiamsoftmusic",
        channel_id="UCvwBBIq_rVNg1QiJR63b18g",
        channel_name="Cafe' Siam | Soft Music & English-Thai Listening",
        pair_label="English × Thai",
        pair_short="EN × TH",
        brand="calbenetic",
        n20dle_suffix="enth",
        learn_hint="English — Thai (romanized). Sit with the line while the café plays.",
        gate_mark="EN",
        gate_blurb=(
            "Soft music autoplays. English × Thai lyric sheets stay open—no "
            "karaoke chase, just listening practice with a little fun between songs."
        ),
        about_blurb=(
            "Café Siam is the English × Thai room of n20dle, a small "
            "bilingual-learning song factory."
        ),
        atlas_lede=(
            "English × Thai songs — diction-first duets with romanized Thai "
            "after every line. Open a row for the lyric sheet, or let Atmosphere "
            "autoplay the room."
        ),
        search_placeholder="Search English, Thai, or lyric lines…",
    ),
    "thenth": Room(
        slug="siam/thenth",
        product="thenth",
        handle="@cafesiamsoftmusicthai",
        channel_id="UCJdG-tCXK2sY31JhFxf_vog",
        channel_name="Cafe' Siam | Soft Music & Thai-English Listening",
        pair_label="Thai × English",
        pair_short="TH × EN",
        brand="jagabenatic",
        n20dle_suffix="then",
        learn_hint="Thai — English. Sit with the line while the café plays.",
        gate_mark="TH",
        gate_blurb=(
            "Soft music autoplays. Thai × English lyric sheets stay open—no "
            "karaoke chase, just listening practice with a little fun between songs."
        ),
        about_blurb=(
            "Café Siam is the Thai × English room of n20dle, a small "
            "bilingual-learning song factory."
        ),
        atlas_lede=(
            "Thai × English songs — diction-first duets for Thai speakers "
            "learning English. Open a row for the lyric sheet, or let Atmosphere "
            "autoplay the room."
        ),
        search_placeholder="Search Thai, English, or lyric lines…",
        has_thai_roman=False,
    ),
    "enjp": Room(
        slug="siam/enjp",
        product="enjp",
        handle="@cafesiamsoftmusicjap",
        channel_id="UCdgklDVDF-adNCt4-f12wjQ",
        channel_name="Cafe' Siam | Soft Music & Eng-Japanese Listening",
        pair_label="English × Japanese",
        pair_short="EN × JP",
        brand="latticia",
        n20dle_suffix="enjp",
        learn_hint="English — Japanese. Sit with the line while the café plays.",
        gate_mark="EN",
        gate_blurb=(
            "Soft music autoplays. English × Japanese lyric sheets stay open—no "
            "karaoke chase, just listening practice with a little fun between songs."
        ),
        about_blurb=(
            "Café Siam is the English × Japanese room of n20dle, a small "
            "bilingual-learning song factory."
        ),
        atlas_lede=(
            "English × Japanese songs — diction-first duets for clear "
            "bilingual listening. Open a row for the lyric sheet, or let Atmosphere "
            "autoplay the room."
        ),
        search_placeholder="Search English, Japanese, or lyric lines…",
        has_thai_roman=False,
    ),
    "thchi": Room(
        slug="siam/thchi",
        product="thchi",
        handle="@cafesiamsoftmusicchi",
        channel_id="UCOlwyMIpoUBsDdscHX9yEbA",
        channel_name="Cafe' Siam | Soft Music & 中文–Thai Listening",
        pair_label="中文 × Thai",
        pair_short="中文 × TH",
        brand="ricenation",
        n20dle_suffix="thchi",
        learn_hint="中文 — Thai (romanized). Sit with the line while the café plays.",
        gate_mark="中",
        gate_blurb=(
            "Soft music autoplays. 中文 × Thai lyric sheets stay open—no "
            "karaoke chase, just listening practice with a little fun between songs."
        ),
        about_blurb=(
            "Café Siam is the 中文 × Thai room of n20dle, a small "
            "bilingual-learning song factory."
        ),
        atlas_lede=(
            "中文 × Thai songs — diction-first duets with romanized Thai "
            "after every line. Open a row for the lyric sheet, or let Atmosphere "
            "autoplay the room."
        ),
        search_placeholder="Search Chinese, Thai, or lyric lines…",
    ),
}

# lang-song-p25-production catalog series (mirrors daily20_* suffix layout).
N20DLE_SERIES_PREFIXES = (
    "lang-song-p25-production_*",
    "lang-song-p25_*",
    "daily20_*",
)
