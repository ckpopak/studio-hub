"""Generate static world HTML pages from episodes-index.json."""

from __future__ import annotations

import json
from pathlib import Path

CHANNEL_ROOT = Path(__file__).resolve().parents[1]
INDEX = CHANNEL_ROOT / "data" / "episodes-index.json"
OUT_DIR = CHANNEL_ROOT / "worlds"

TEMPLATE = """<!DOCTYPE html>
<html lang=\"en\">
  <head>
    <meta charset=\"utf-8\" />
    <meta name=\"viewport\" content=\"width=device-width, initial-scale=1\" />
    <title>{title_en} · {title_zh} — Cafe QuietLY 靜</title>
    <meta
      name=\"description\"
      content=\"QuietLY Episode {ep} vinyl sleeve: album cover, gatefold liner notes, and full lyrics for {title_zh}.\"
    />
    <link rel=\"preconnect\" href=\"https://fonts.googleapis.com\" />
    <link rel=\"preconnect\" href=\"https://fonts.gstatic.com\" crossorigin />
    <link
      href=\"https://fonts.googleapis.com/css2?family=Instrument+Serif:ital@0;1&family=Noto+Serif+TC:wght@400;500;600&family=Outfit:wght@300;400;500&display=swap\"
      rel=\"stylesheet\"
    />
    <link rel=\"stylesheet\" href=\"../css/quietly.css\" />
    <link rel=\"stylesheet\" href=\"../css/episode.css\" />
  </head>
  <body data-episode=\"../data/episode-{ep:02d}.json\">
    <nav class=\"site-nav\" aria-label=\"Primary\">
      <a class=\"site-nav__brand\" href=\"../index.html\">靜</a>
      <div class=\"site-nav__links\">
        <a href=\"../atmosphere.html?ep={ep}\">Atmosphere</a>
        <a href=\"../index.html\">Shelf</a>
        <a href=\"../../../index.html\">Studio</a>
      </div>
    </nav>

    <header class=\"hero\" id=\"hero\">
      <div class=\"hero__media\" aria-hidden=\"true\">
        <img id=\"hero-image\" src=\"\" alt=\"\" width=\"1920\" height=\"1080\" hidden />
        <div class=\"hero__veil\"></div>
        <div class=\"hero__atmosphere\" id=\"hero-atmosphere\" aria-hidden=\"true\"></div>
      </div>

      <div class=\"sleeve\" aria-hidden=\"true\">
        <div class=\"vinyl\">
          <div class=\"vinyl__disc\">
            <div class=\"vinyl__grooves\"></div>
            <div class=\"vinyl__label\">
              <span class=\"vinyl__mark\">靜</span>
              <span class=\"vinyl__ep\">EP {ep:02d}</span>
            </div>
          </div>
        </div>
      </div>

      <div class=\"hero__content\">
        <div class=\"brand\">
          <span class=\"brand__mark\" aria-hidden=\"true\">靜</span>
          <div>
            <div class=\"brand__name serif\">QuietLY</div>
            <span class=\"brand__sub\">Vinyl sleeve · Episode {ep}</span>
          </div>
        </div>
        <h1 class=\"hero__title serif\" id=\"hero-title\">
          {title_en}
          <span class=\"zh\">{title_zh}</span>
        </h1>
        <p class=\"hero__lede\" id=\"hero-lede\">{logline}</p>
        <a class=\"hero__cta\" href=\"#liner\">
          Open the sleeve
          <i aria-hidden=\"true\"></i>
        </a>
      </div>
    </header>

    <main class=\"gatefold\">
      <section class=\"section liner-intro\" id=\"liner\" aria-labelledby=\"liner-title\">
        <p class=\"section__eyebrow reveal\">Inner gatefold</p>
        <h2 class=\"section__title serif reveal\" id=\"liner-title\">
          Quiet comic · before the needle
        </h2>
        <p class=\"section__note reveal\">
          Four frames printed on the inner sleeve. Captions hold the room; images appear when ready.
        </p>
        <div class=\"comics\" id=\"comics-root\"></div>
      </section>

      <section class=\"session reveal\" id=\"session\" aria-labelledby=\"session-title\">
        <p class=\"section__eyebrow\">Turntable</p>
        <h2 class=\"section__title serif\" id=\"session-title\">Long listening</h2>
        <p class=\"section__note\">
          Official Episode {ep} upload. Track cues follow the published YouTube chapter times.
          Lyric text is taken from <code>songs/prompts/episode-{ep:02d}/*.md</code>.
        </p>
        <div class=\"player-shell\">
          <div class=\"player-shell__frame\">
            <div id=\"yt-player\"></div>
          </div>
          <div class=\"player-shell__meta\">
            <span class=\"player-shell__now\"
              >Now · <strong id=\"now-track\">—</strong></span
            >
            <span>QuietLY · Ep {ep}</span>
          </div>
        </div>
        <p class=\"proto-note\" id=\"video-missing\" hidden>
          Video ID not resolved yet for this episode. Lyrics remain readable.
        </p>
      </section>

      <section class=\"section liner\" id=\"lyrics\" aria-labelledby=\"lyrics-title\">
        <div class=\"liner__head reveal\">
          <p class=\"section__eyebrow\">Liner notes</p>
          <h2 class=\"section__title serif\" id=\"lyrics-title\">
            Full lyrics · printed insert
          </h2>
          <p class=\"section__note\">
            Complete lyric blocks from n20dle — section tags, poetry, and English lines.
            Press a row to drop the needle.
          </p>
        </div>
        <div class=\"back-cover reveal\" id=\"back-cover\">
          <div class=\"back-cover__side\">
            <span class=\"back-cover__label\">Side A</span>
            <ol class=\"tracklist\" id=\"tracklist-a\"></ol>
          </div>
          <div class=\"back-cover__side\">
            <span class=\"back-cover__label\">Side B</span>
            <ol class=\"tracklist\" id=\"tracklist-b\"></ol>
          </div>
        </div>
        <div class=\"booklet\" id=\"songs\"></div>
      </section>
    </main>

    <footer class=\"site-footer\">
      <p>
        <span class=\"mark\">靜</span>
        Lyrics source of truth:
        <code>n20dle/songs/prompts/episode-{ep:02d}/*.md</code> · Lyrics fenced blocks.
      </p>
      <div class=\"site-footer__links\">
        <a href=\"../index.html\">All sleeves</a>
        <a href=\"../atmosphere.html?ep={ep}\">Play atmosphere</a>
        <a href=\"../about.html\">About</a>
        <a id=\"yt-link\" href=\"https://www.youtube.com/@cafequietlysoftmusic\" target=\"_blank\" rel=\"noopener noreferrer\">Watch on YouTube</a>
      </div>
    </footer>

    <div class=\"dock\" id=\"dock\" aria-hidden=\"true\">
      <div class=\"dock__inner\">
        <div class=\"dock__label\">
          <span class=\"dock__kicker\">On the platter</span>
          <p class=\"dock__track serif\" id=\"dock-track\">—</p>
        </div>
        <button class=\"dock__btn\" type=\"button\" id=\"dock-jump\">Show turntable</button>
      </div>
    </div>

    <script src=\"../js/reveal.js\"></script>
    <script src=\"../js/episode-player.js\"></script>
  </body>
</html>
"""


def main() -> None:
    index = json.loads(INDEX.read_text(encoding="utf-8"))
    OUT_DIR.mkdir(parents=True, exist_ok=True)
    for item in index:
        ep = item["episode"]
        html = TEMPLATE.format(
            ep=ep,
            title_en=item["title"]["en"],
            title_zh=item["title"]["zh"],
            logline=item["logline"],
        )
        path = OUT_DIR / f"{item['slug']}.html"
        path.write_text(html, encoding="utf-8")
        print("wrote", path.name)
    print(f"generated {len(index)} world pages")


if __name__ == "__main__":
    main()
