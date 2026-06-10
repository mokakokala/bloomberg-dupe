#!/bin/bash
# Launch the terminal: backend (FastAPI :8000) + frontend (Vite :5173),
# then open the browser. Ctrl+C stops everything.
set -e
DIR="$(cd "$(dirname "$0")" && pwd)"

# Already running? Just open the browser.
if curl -s -o /dev/null --max-time 1 http://localhost:5173; then
  echo "TERMINAL is already running — opening browser."
  open http://localhost:5173
  exit 0
fi

cleanup() { kill 0; }
trap cleanup EXIT

(cd "$DIR/backend" && .venv/bin/uvicorn main:app --port 8000) &
(cd "$DIR/frontend" && npm run dev) &

# Wait for the frontend to come up (max ~15s), then open the browser.
for _ in $(seq 1 30); do
  if curl -s -o /dev/null --max-time 1 http://localhost:5173; then
    break
  fi
  sleep 0.5
done

echo ""
echo "  TERMINAL ready → http://localhost:5173"
echo "  (laisse cette fenêtre ouverte ; Ctrl+C ou ferme-la pour tout arrêter)"
echo ""
open http://localhost:5173
wait
