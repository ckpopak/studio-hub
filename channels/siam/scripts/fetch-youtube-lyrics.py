#!/usr/bin/env python3
"""
Fetch YouTube video descriptions containing lyrics for Café Siam videos.
Uses Playwright to access YouTube descriptions without API or bot detection issues.

Usage:
    python fetch-youtube-lyrics.py channels/siam/enthp/data/songs.json
    python fetch-youtube-lyrics.py channels/siam/enthp/data/songs.json --limit 10
"""

import json
import sys
import time
import re
from pathlib import Path
from typing import Dict, List, Optional
import argparse

try:
    from playwright.sync_api import sync_playwright, TimeoutError as PlaywrightTimeout
except ImportError:
    print("ERROR: playwright not installed. Run: pip install playwright && playwright install")
    sys.exit(1)


def extract_lyrics_from_description(description: str) -> Optional[str]:
    """Extract lyrics section from video description."""
    if not description:
        return None
    
    # Look for lyrics marker
    lyrics_markers = [
        "—— Lyrics ——",
        "— Lyrics —",
        "[Intro]",
        "[Verse",
    ]
    
    for marker in lyrics_markers:
        if marker in description:
            # Find position of marker
            idx = description.find(marker)
            # Extract from marker to end
            lyrics = description[idx:]
            
            # Clean up: remove excess whitespace
            lyrics = re.sub(r'\n\s*\n\s*\n', '\n\n', lyrics)
            
            return lyrics.strip()
    
    return None


def fetch_video_description(video_id: str, browser_context) -> Optional[str]:
    """Fetch description from YouTube video page."""
    url = f"https://www.youtube.com/watch?v={video_id}"
    
    try:
        page = browser_context.new_page()
        
        # Navigate to video
        print(f"  Loading {video_id}...", end=" ", flush=True)
        page.goto(url, wait_until="networkidle", timeout=30000)
        
        # Wait a bit for dynamic content
        time.sleep(2)
        
        # Try multiple selectors for description
        description = None
        
        # Method 1: Try the description-inline-expander
        try:
            desc_elem = page.locator("ytd-text-inline-expander#description-inline-expander").first
            if desc_elem.count() > 0:
                # Try to click "more" button if present
                try:
                    more_button = page.locator("#description tp-yt-paper-button#expand, #expand").first
                    if more_button.is_visible(timeout=1000):
                        more_button.click()
                        time.sleep(0.5)
                except:
                    pass
                
                description = desc_elem.inner_text(timeout=3000)
        except Exception as e:
            pass
        
        # Method 2: Try getting from meta description
        if not description or len(description) < 50:
            try:
                meta_desc = page.locator('meta[name="description"]').first
                if meta_desc.count() > 0:
                    description = meta_desc.get_attribute("content", timeout=2000)
            except:
                pass
        
        # Method 3: Try yt-formatted-string in description
        if not description or len(description) < 50:
            try:
                desc_text = page.locator("yt-formatted-string.content").first
                if desc_text.count() > 0:
                    description = desc_text.inner_text(timeout=3000)
            except:
                pass
        
        if description and len(description) > 20:
            print("✓")
            page.close()
            return description
        else:
            print("✗ (no description found)")
            page.close()
            return None
        
    except PlaywrightTimeout as e:
        print(f"✗ (timeout)")
        try:
            page.close()
        except:
            pass
        return None
    except Exception as e:
        print(f"✗ (error: {type(e).__name__})")
        try:
            page.close()
        except:
            pass
        return None


def process_songs_file(
    songs_file: Path,
    limit: Optional[int] = None,
    skip_with_lyrics: bool = True,
) -> Dict:
    """Process a songs.json file and fetch lyrics."""
    
    print(f"\n{'='*60}")
    print(f"Processing: {songs_file}")
    print(f"{'='*60}\n")
    
    # Load songs data
    with open(songs_file, 'r', encoding='utf-8') as f:
        data = json.load(f)
    
    songs = data.get('songs', [])
    print(f"Total songs in file: {len(songs)}")
    
    # Filter songs that need lyrics
    songs_to_process = []
    for song in songs:
        if skip_with_lyrics and song.get('has_lyrics') and song.get('lyrics'):
            continue
        songs_to_process.append(song)
    
    print(f"Songs needing lyrics: {len(songs_to_process)}")
    
    if limit:
        songs_to_process = songs_to_process[:limit]
        print(f"Limited to first: {limit}")
    
    if not songs_to_process:
        print("No songs to process!")
        return data
    
    # Start browser
    print("\nLaunching browser...")
    with sync_playwright() as p:
        browser = p.chromium.launch(
            headless=True,
            args=[
                '--disable-blink-features=AutomationControlled',
                '--disable-dev-shm-usage',
            ]
        )
        context = browser.new_context(
            user_agent="Mozilla/5.0 (X11; Linux x86_64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/120.0.0.0 Safari/537.36",
            viewport={'width': 1280, 'height': 720},
        )
        
        stats = {
            'processed': 0,
            'lyrics_found': 0,
            'no_lyrics': 0,
            'errors': 0,
        }
        
        print(f"\nFetching descriptions...\n")
        
        for i, song in enumerate(songs_to_process, 1):
            video_id = song.get('id')
            title = song.get('title', 'Unknown')
            
            print(f"[{i}/{len(songs_to_process)}] {title}")
            
            # Fetch description
            description = fetch_video_description(video_id, context)
            stats['processed'] += 1
            
            if description:
                # Extract lyrics
                lyrics = extract_lyrics_from_description(description)
                
                if lyrics:
                    # Drop YouTube UI tail after hashtags / transcript prompts
                    lyrics = re.split(
                        r"\n(?:#\w+.*\n)?(?:Transcript|Show transcript|Show less|Follow along)",
                        lyrics,
                        maxsplit=1,
                    )[0].strip()
                    # Remove trailing hashtag lines
                    lines = lyrics.splitlines()
                    while lines and lines[-1].startswith("#"):
                        lines.pop()
                    lyrics = "\n".join(lines).strip()

                if lyrics:
                    # Update song in original data
                    for s in data['songs']:
                        if s['id'] == video_id:
                            s['lyrics'] = lyrics
                            s['has_lyrics'] = True
                            break
                    
                    stats['lyrics_found'] += 1
                    print(f"    ✓ Lyrics extracted ({len(lyrics)} chars)")
                else:
                    stats['no_lyrics'] += 1
                    print(f"    ⚠ No lyrics section found in description")
            else:
                stats['errors'] += 1
            
            # Polite delay between requests
            if i < len(songs_to_process):
                time.sleep(3)
        
        context.close()
        browser.close()
    
    # Print statistics
    print(f"\n{'='*60}")
    print("STATISTICS")
    print(f"{'='*60}")
    print(f"Processed:     {stats['processed']}")
    print(f"Lyrics found:  {stats['lyrics_found']}")
    print(f"No lyrics:     {stats['no_lyrics']}")
    print(f"Errors:        {stats['errors']}")
    print(f"{'='*60}\n")
    
    return data


def main():
    parser = argparse.ArgumentParser(
        description="Fetch YouTube video lyrics from descriptions"
    )
    parser.add_argument(
        'songs_file',
        type=Path,
        help='Path to songs.json file'
    )
    parser.add_argument(
        '--limit',
        type=int,
        help='Limit number of videos to process (for testing)'
    )
    parser.add_argument(
        '--no-skip',
        action='store_true',
        help='Process all songs, even those with existing lyrics'
    )
    parser.add_argument(
        '--dry-run',
        action='store_true',
        help='Do not save changes to file'
    )
    
    args = parser.parse_args()
    
    if not args.songs_file.exists():
        print(f"ERROR: File not found: {args.songs_file}")
        sys.exit(1)
    
    # Process the file
    updated_data = process_songs_file(
        args.songs_file,
        limit=args.limit,
        skip_with_lyrics=not args.no_skip
    )
    
    # Save updated data
    if not args.dry_run:
        backup_file = args.songs_file.with_suffix('.json.backup')
        print(f"Creating backup: {backup_file}")
        with open(backup_file, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
        
        print(f"Saving updated data: {args.songs_file}")
        with open(args.songs_file, 'w', encoding='utf-8') as f:
            json.dump(updated_data, f, ensure_ascii=False, indent=2)
        
        print("\n✓ Done!")
    else:
        print("\n✓ Dry run complete (no changes saved)")


if __name__ == "__main__":
    main()
