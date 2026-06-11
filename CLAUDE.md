# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project

A free Bloomberg Terminal clone ("TERMINAL"): FastAPI backend aggregating free data sources + React frontend mimicking the Bloomberg UI (command line, 4-panel grid, black/orange theme). Public repo: https://github.com/mokakokala/bloomberg-dupe. The user is French-speaking (respond in French, README is in French) and is based in Brussels (hence ECO defaults to the EUROPE tab).

**Core constraint: everything must stay 100% free — no API keys, no paid tiers, no accounts.** Current sources: Yahoo Finance (via yfinance, ~15 min delay), FRED (keyless fredgraph.csv), ECB Data Portal (keyless SDMX csvdata), SEC EDGAR, RSS feeds, Binance public websocket (the only true real-time data).

## Commands

```bash
./start.sh                       # run everything (backend :8000 + frontend :5173 + opens browser)
                                 # "Lancer TERMINAL.command" is the double-clickable Finder wrapper

# Backend (Python 3.13, venv in backend/.venv)
cd backend && .venv/bin/uvicorn main:app --port 8000
backend/.venv/bin/pip install -r backend/requirements.txt   # first install

# Frontend (React 19 + TypeScript + Vite)
cd frontend && npm run dev       # dev server
cd frontend && npx tsc -b        # type-check (primary verification — no test suite exists)
cd frontend && npm run lint      # eslint
cd frontend && npm run build     # tsc -b && vite build
```

There is no test suite. Verification = `tsc -b`, curl the API endpoints, and drive the UI in a browser (Playwright MCP tools were used for this).

## Architecture

```
frontend (React, :5173) ──HTTP──▶ backend/main.py (FastAPI, :8000) ──▶ Yahoo/FRED/ECB/SEC/RSS
        └────────websocket direct──────▶ Binance (CRYP real-time, no backend involved)
```

### Backend — single file `backend/main.py`

Pure aggregator: no database, no auth, no state except an in-memory TTL cache (`cached(key, ttl, fn)` wraps every endpoint; quotes 30s, boards 45s, news 5min, fundamentals/macro 1h, SEC ticker→CIK map 24h). Endpoints all live under `/api/...`. Parallel fan-out uses `ThreadPoolExecutor`. Gotchas learned the hard way:

- RSS feeds must be fetched through `requests` with a `Mozilla/5.0` User-Agent then parsed via `feedparser.parse(r.content)` — feedparser's own UA gets blocked.
- `/api/filings/{symbol}` must reject tickers containing `.` (Yahoo exchange suffixes like `MC.PA`): stripping the suffix silently matched the wrong US company in the SEC map.
- `/api/eco` (FRED/US) and `/api/eco/eu` (ECB) must return the **same row shape** `{id,label,value,suffix,date,spark}` — the frontend `Eco` view renders both with one table.
- ECB series are addressed as `FLOW/KEY` (e.g. `ICP/M.U2.N.000000.4.ANR`) against `data-api.ecb.europa.eu` with `format=csvdata`; parse `TIME_PERIOD`/`OBS_VALUE` columns by name.

### Frontend — `frontend/src/`

The Bloomberg interaction model is the heart of the app:

- `commands.ts` — parses Bloomberg-style commands (`AAPL GP`, `GP AAPL`, `COMP AAPL MSFT`, bare ticker inherits the active panel's function; `US`/`EQUITY`/`GO` tokens are ignored noise). Produces a `PanelState {func, ticker?, tickers?}`.
- `App.tsx` — owns the 4 `PanelState`s (persisted to localStorage), the active panel, per-panel back-history (`BACK`/`MENU` command + ← header button), the maximize state, and the **global alert engine** (polls `/quotes` every 30s for armed alerts regardless of which panels are open; fires browser Notification + banner).
- `views/` — one component per function, dispatched by the `View` switch in `App.tsx`. Boards (WEI/FXC/CMDTY) share `Board.tsx`; CRYP uses `CrypLive.tsx` (REST snapshot + Binance websocket overlay).
- `hooks.ts` — `usePoll(path, intervalMs)` for fetch+refresh, `useStored(key, initial)` for localStorage state (watchlist `"watchlist"`, portfolio `"portfolio"`, alerts `"alerts"`, panels `"panels"`, ECO region `"eco-region"`). All user data is localStorage-only; nothing is ever sent anywhere.
- `indicators.ts` — SMA/Bollinger/RSI/MACD computed client-side from raw bars; RSI/MACD render in extra lightweight-charts **panes** (v5 API: `chart.addSeries(Def, opts, paneIndex)`).

**To add a new function (e.g. a new Bloomberg mnemonic):** add it to `Func` + `FUNCTIONS` (+ alias) in `commands.ts`, create `views/X.tsx`, add a case to the `View` switch in `App.tsx`, add an example in `views/Help.tsx`, document it in `README.md`. Backend: add an endpoint in `main.py` wrapped in `cached()`.

Tickers use Yahoo notation everywhere: `MC.PA`, `^GSPC`, `EURUSD=X`, `BTC-USD`, `GC=F`.

## Conventions

- Commits: imperative summary + short body; end with `Co-Authored-By: Claude Fable 5 <noreply@anthropic.com>`. Git email must stay the GitHub noreply address (`137334751+mokakokala@users.noreply.github.com`) — the user's real email was scrubbed from history on purpose.
- `.gitignore` excludes all `*.png` — the README screenshot is force-added at `docs/screenshot.png` (`git add -f`).
- UI text/labels are in English (like the real Bloomberg); README and user communication in French.
- Disclaimers matter: data is delayed/best-effort, "not for trading" — keep the footer and README honest about limits.
