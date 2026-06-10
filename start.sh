#!/bin/bash
# Launch the terminal: backend (FastAPI :8000) + frontend (Vite :5173)
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

cleanup() { kill 0; }
trap cleanup EXIT

(cd "$DIR/backend" && .venv/bin/uvicorn main:app --port 8000) &
(cd "$DIR/frontend" && npm run dev) &

sleep 2
echo ""
echo "  TERMINAL ready → http://localhost:5173"
echo ""
wait
