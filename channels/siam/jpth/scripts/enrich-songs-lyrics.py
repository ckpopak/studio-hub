#!/usr/bin/env python3
"""Enrich jpth lyric sheets via shared Café Siam pipeline."""

from __future__ import annotations

import runpy
import sys
from pathlib import Path

sys.argv = [sys.argv[0], "jpth", *sys.argv[1:]]
runpy.run_path(
    str(Path(__file__).resolve().parents[2] / "scripts" / "enrich-songs-lyrics.py"),
    run_name="__main__",
)
