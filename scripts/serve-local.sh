#!/usr/bin/env bash
set -euo pipefail

PORT="${PORT:-8765}"
HOST="${HOST:-127.0.0.1}"
ROOT="$(cd "$(dirname "$0")/.." && pwd)"

echo "Serving studio-hub from ${ROOT}"
echo "Open http://${HOST}:${PORT}/"
exec python3 -m http.server "${PORT}" --bind "${HOST}" --directory "${ROOT}"
