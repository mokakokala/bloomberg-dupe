# TERMINAL — Bloomberg-style terminal, 100% free data

Un terminal financier inspiré de Bloomberg, construit uniquement sur des sources de données gratuites.

## Lancer

```bash
./start.sh
# puis ouvrir http://localhost:5173
```

Ou manuellement :

```bash
# backend
cd backend && .venv/bin/uvicorn main:app --port 8000

# frontend (autre terminal)
cd frontend && npm run dev
```

Première installation : `python3 -m venv backend/.venv && backend/.venv/bin/pip install -r backend/requirements.txt` et `cd frontend && npm install`.

## Utilisation

Tape une commande dans la barre du haut puis Entrée (`<GO>`). La commande s'applique au **panneau actif** (bordure orange — clique sur un panneau pour l'activer). Double-clic sur l'en-tête d'un panneau pour le maximiser.

| Commande | Fonction |
|---|---|
| `AAPL GP` | Graphique de prix (bougies/ligne, volumes, SMA 50, plages 1D→MAX) + indicateurs **BOLL / RSI / MACD** |
| `AAPL GIP` | Graphique intraday (1 jour, bougies 5 min) |
| `COMP AAPL MSFT GOOG` | Comparaison de performances normalisées (%) sur un même graphe |
| `AAPL DES` | Description société + ratios + management |
| `AAPL FA` | États financiers (compte de résultat, bilan, cash flow — annuel/trimestriel) |
| `AAPL Q` | Tableau de cotation |
| `AAPL N` | News du titre |
| `AAPL FIL` | Filings SEC EDGAR (10-K, 10-Q, 8-K…) — titres US |
| `TOP` | News marchés (CNBC, MarketWatch, Yahoo, Investing) |
| `WEI` | Indices mondiaux |
| `FXC` | Devises |
| `CRYP` | Cryptomonnaies — **temps réel** via websocket Binance |
| `CMDTY` | Matières premières |
| `EQS` | Screener (gainers / losers / most active) |
| `ECO` | Indicateurs macro US (FRED) |
| `CAL` | Calendrier résultats & dividendes des tickers de la watchlist |
| `W` | Watchlist (persistée en local) |
| `PORT` | Portefeuille avec P&L (persisté en local) |
| `ALRT` | Alertes de prix (vérifiées toutes les 30 s, notifications navigateur) |
| `HELP` | Liste des commandes |

Tickers au format Yahoo Finance : `AAPL`, `MC.PA` (Paris), `BMW.DE`, `^GSPC` (indice), `EURUSD=X`, `BTC-USD`, `GC=F` (futures).

## Sources de données (gratuites)

- **Yahoo Finance** (via yfinance) — cotations (~15 min de délai), historique, fondamentaux, news, screener, calendrier
- **FRED** (Fed de St. Louis) — séries macro US, sans clé API
- **SEC EDGAR** — filings réglementaires US, API officielle gratuite
- **Binance** — websocket public pour la crypto en temps réel
- **Flux RSS** — news marchés

⚠️ Données à usage informatif uniquement, pas pour le trading temps réel.

## Architecture

- `backend/` — FastAPI (Python), agrégation + cache TTL en mémoire
- `frontend/` — React + Vite + TypeScript, graphiques TradingView Lightweight Charts
