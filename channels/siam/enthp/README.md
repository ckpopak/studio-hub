# Café Siam EN×TH — local channel site

Independent site for **@cafesiamsoftmusic** (English × Thai).
Not linked from QuietLY; other Café Siam pairs stay separate.

## Data

```bash
# Clone / update production lyrics repo, then:
export LANG_SONG_PROD=/path/to/lang-song-p25-production
python3 scripts/import-from-production.py
python3 scripts/enrich-catalog.py
```

Lyrics are imported from `n20dle/catalog/*_thai/*/lyrics.txt` in
[lang-song-p25-production](https://github.com/ckpopak/lang-song-p25-production).

## Local preview

```bash
cd channels/siam/enthp
python3 -m http.server 8765
# open http://127.0.0.1:8765/
```
