"""
Terminal backend — aggregates free market data sources behind one API.

Sources:
  - Yahoo Finance via yfinance (quotes, history, fundamentals, news, screeners)
  - FRED public CSV endpoints (macro series, no API key required)
  - RSS feeds (market news)
"""
import csv
import io
import time
import threading
from concurrent.futures import ThreadPoolExecutor

import feedparser
import requests
import yfinance as yf
from fastapi import FastAPI, HTTPException
from fastapi.middleware.cors import CORSMiddleware

app = FastAPI(title="Terminal API")
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["*"],
    allow_headers=["*"],
)

# ---------------------------------------------------------------- cache

_cache: dict[str, tuple[float, object]] = {}
_cache_lock = threading.Lock()


def cached(key: str, ttl: float, fn):
    now = time.time()
    with _cache_lock:
        hit = _cache.get(key)
        if hit and now - hit[0] < ttl:
            return hit[1]
    value = fn()
    with _cache_lock:
        _cache[key] = (now, value)
    return value


# ---------------------------------------------------------------- quotes

def _quote_one(symbol: str) -> dict:
    t = yf.Ticker(symbol)
    try:
        fi = t.fast_info
        last = fi.last_price
        prev = fi.previous_close
        return {
            "symbol": symbol,
            "price": last,
            "prevClose": prev,
            "change": (last - prev) if last is not None and prev else None,
            "changePct": ((last - prev) / prev * 100) if last is not None and prev else None,
            "dayHigh": fi.day_high,
            "dayLow": fi.day_low,
            "open": fi.open,
            "volume": fi.last_volume,
            "currency": fi.currency,
            "exchange": fi.exchange,
        }
    except Exception:
        return {"symbol": symbol, "price": None, "error": True}


def quote_many(symbols: list[str]) -> list[dict]:
    with ThreadPoolExecutor(max_workers=12) as ex:
        return list(ex.map(_quote_one, symbols))


@app.get("/api/quote/{symbol}")
def quote(symbol: str):
    return cached(f"q:{symbol.upper()}", 30, lambda: _quote_one(symbol.upper()))


@app.get("/api/quotes")
def quotes(symbols: str):
    syms = [s.strip().upper() for s in symbols.split(",") if s.strip()][:40]
    return cached(f"qs:{','.join(syms)}", 30, lambda: quote_many(syms))


# ---------------------------------------------------------------- history (GP)

RANGE_INTERVAL = {
    "1D": ("1d", "5m"),
    "5D": ("5d", "15m"),
    "1M": ("1mo", "1h"),
    "3M": ("3mo", "1d"),
    "6M": ("6mo", "1d"),
    "YTD": ("ytd", "1d"),
    "1Y": ("1y", "1d"),
    "5Y": ("5y", "1wk"),
    "MAX": ("max", "1mo"),
}


@app.get("/api/history/{symbol}")
def history(symbol: str, range: str = "1Y"):
    rng = range.upper()
    if rng not in RANGE_INTERVAL:
        raise HTTPException(400, f"range must be one of {list(RANGE_INTERVAL)}")
    period, interval = RANGE_INTERVAL[rng]

    def fetch():
        df = yf.Ticker(symbol.upper()).history(period=period, interval=interval, auto_adjust=True)
        if df.empty:
            raise HTTPException(404, f"no data for {symbol}")
        bars = []
        for ts, row in df.iterrows():
            bars.append({
                "time": int(ts.timestamp()),
                "open": round(float(row["Open"]), 4),
                "high": round(float(row["High"]), 4),
                "low": round(float(row["Low"]), 4),
                "close": round(float(row["Close"]), 4),
                "volume": int(row["Volume"]) if row["Volume"] == row["Volume"] else 0,
            })
        return {"symbol": symbol.upper(), "range": rng, "interval": interval, "bars": bars}

    return cached(f"h:{symbol.upper()}:{rng}", 60 if rng in ("1D", "5D") else 600, fetch)


# ---------------------------------------------------------------- profile (DES)

@app.get("/api/profile/{symbol}")
def profile(symbol: str):
    def fetch():
        t = yf.Ticker(symbol.upper())
        info = t.info or {}
        if not info.get("longName") and not info.get("shortName"):
            raise HTTPException(404, f"no profile for {symbol}")
        officers = [
            {"name": o.get("name"), "title": o.get("title")}
            for o in (info.get("companyOfficers") or [])[:6]
        ]
        keys = [
            "longName", "shortName", "symbol", "exchange", "currency", "country",
            "sector", "industry", "fullTimeEmployees", "website", "city",
            "longBusinessSummary", "marketCap", "trailingPE", "forwardPE",
            "priceToBook", "dividendYield", "beta", "fiftyTwoWeekHigh",
            "fiftyTwoWeekLow", "averageVolume", "sharesOutstanding",
            "totalRevenue", "ebitda", "profitMargins", "returnOnEquity",
            "debtToEquity", "freeCashflow", "earningsGrowth", "revenueGrowth",
            "targetMeanPrice", "recommendationKey", "numberOfAnalystOpinions",
            "earningsTimestamp", "trailingEps", "forwardEps", "enterpriseValue",
        ]
        out = {k: info.get(k) for k in keys}
        out["officers"] = officers
        return out

    return cached(f"p:{symbol.upper()}", 3600, fetch)


# ---------------------------------------------------------------- financials (FA)

def _df_to_statement(df, max_cols=5, max_rows=40):
    if df is None or df.empty:
        return {"columns": [], "rows": []}
    df = df.iloc[:max_rows, :max_cols]
    cols = [c.strftime("%Y-%m-%d") if hasattr(c, "strftime") else str(c) for c in df.columns]
    rows = []
    for name, series in df.iterrows():
        vals = [None if v != v else float(v) for v in series.values]
        rows.append({"label": str(name), "values": vals})
    return {"columns": cols, "rows": rows}


@app.get("/api/financials/{symbol}")
def financials(symbol: str, period: str = "annual"):
    quarterly = period == "quarterly"

    def fetch():
        t = yf.Ticker(symbol.upper())
        return {
            "income": _df_to_statement(t.quarterly_income_stmt if quarterly else t.income_stmt),
            "balance": _df_to_statement(t.quarterly_balance_sheet if quarterly else t.balance_sheet),
            "cashflow": _df_to_statement(t.quarterly_cashflow if quarterly else t.cashflow),
        }

    return cached(f"f:{symbol.upper()}:{period}", 3600, fetch)


# ---------------------------------------------------------------- market boards

WORLD_INDICES = [
    ("^GSPC", "S&P 500"), ("^DJI", "DOW JONES"), ("^IXIC", "NASDAQ"),
    ("^RUT", "RUSSELL 2000"), ("^VIX", "VIX"), ("^GSPTSE", "TSX"),
    ("^FTSE", "FTSE 100"), ("^GDAXI", "DAX"), ("^FCHI", "CAC 40"),
    ("^STOXX50E", "EURO STOXX 50"), ("^IBEX", "IBEX 35"), ("^SSMI", "SMI"),
    ("^N225", "NIKKEI 225"), ("^HSI", "HANG SENG"), ("000001.SS", "SHANGHAI"),
    ("^KS11", "KOSPI"), ("^AXJO", "ASX 200"), ("^BSESN", "SENSEX"),
]
FX_PAIRS = [
    ("EURUSD=X", "EUR/USD"), ("GBPUSD=X", "GBP/USD"), ("USDJPY=X", "USD/JPY"),
    ("USDCHF=X", "USD/CHF"), ("AUDUSD=X", "AUD/USD"), ("USDCAD=X", "USD/CAD"),
    ("USDCNY=X", "USD/CNY"), ("EURGBP=X", "EUR/GBP"), ("EURJPY=X", "EUR/JPY"),
    ("EURCHF=X", "EUR/CHF"), ("NZDUSD=X", "NZD/USD"), ("USDMXN=X", "USD/MXN"),
]
CRYPTO = [
    ("BTC-USD", "BITCOIN"), ("ETH-USD", "ETHEREUM"), ("SOL-USD", "SOLANA"),
    ("BNB-USD", "BNB"), ("XRP-USD", "XRP"), ("ADA-USD", "CARDANO"),
    ("DOGE-USD", "DOGECOIN"), ("AVAX-USD", "AVALANCHE"), ("DOT1-USD", "POLKADOT"),
]
COMMODITIES = [
    ("GC=F", "GOLD"), ("SI=F", "SILVER"), ("HG=F", "COPPER"), ("PL=F", "PLATINUM"),
    ("CL=F", "WTI CRUDE"), ("BZ=F", "BRENT"), ("NG=F", "NAT GAS"),
    ("ZW=F", "WHEAT"), ("ZC=F", "CORN"), ("ZS=F", "SOYBEANS"),
    ("KC=F", "COFFEE"), ("CT=F", "COTTON"),
]


def _board(pairs, ttl=45):
    key = "b:" + ",".join(s for s, _ in pairs)

    def fetch():
        names = dict(pairs)
        rows = quote_many([s for s, _ in pairs])
        for r in rows:
            r["name"] = names.get(r["symbol"], r["symbol"])
        return rows

    return cached(key, ttl, fetch)


@app.get("/api/indices")
def indices():
    return _board(WORLD_INDICES)


@app.get("/api/fx")
def fx():
    return _board(FX_PAIRS)


@app.get("/api/crypto")
def crypto():
    return _board(CRYPTO)


@app.get("/api/commodities")
def commodities():
    return _board(COMMODITIES)


# ---------------------------------------------------------------- news (TOP / N)

RSS_FEEDS = [
    ("CNBC", "https://search.cnbc.com/rs/search/combinedcms/view.xml?partnerId=wrss01&id=100003114"),
    ("MarketWatch", "https://feeds.content.dowjones.io/public/rss/mw_topstories"),
    ("Yahoo Finance", "https://finance.yahoo.com/news/rssindex"),
    ("Investing.com", "https://www.investing.com/rss/news.rss"),
]


def _parse_feed(args):
    source, url = args
    items = []
    try:
        r = requests.get(url, timeout=10, headers={"User-Agent": "Mozilla/5.0"})
        parsed = feedparser.parse(r.content)
        for e in parsed.entries[:15]:
            ts = None
            if getattr(e, "published_parsed", None):
                ts = int(time.mktime(e.published_parsed))
            items.append({
                "source": source,
                "title": e.get("title", ""),
                "link": e.get("link", ""),
                "time": ts,
            })
    except Exception:
        pass
    return items


@app.get("/api/news")
def news():
    def fetch():
        with ThreadPoolExecutor(max_workers=4) as ex:
            lists = list(ex.map(_parse_feed, RSS_FEEDS))
        items = [i for sub in lists for i in sub]
        items.sort(key=lambda i: i["time"] or 0, reverse=True)
        return items[:60]

    return cached("news:top", 300, fetch)


@app.get("/api/news/{symbol}")
def ticker_news(symbol: str):
    def fetch():
        raw = yf.Ticker(symbol.upper()).news or []
        items = []
        for n in raw[:25]:
            c = n.get("content", n)
            ts = c.get("pubDate") or c.get("displayTime")
            epoch = None
            if isinstance(ts, str):
                try:
                    from datetime import datetime
                    epoch = int(datetime.fromisoformat(ts.replace("Z", "+00:00")).timestamp())
                except ValueError:
                    pass
            elif isinstance(ts, (int, float)):
                epoch = int(ts)
            link = c.get("canonicalUrl", {})
            items.append({
                "source": (c.get("provider") or {}).get("displayName", "Yahoo"),
                "title": c.get("title", ""),
                "link": link.get("url") if isinstance(link, dict) else c.get("link", ""),
                "time": epoch,
            })
        return items

    return cached(f"news:{symbol.upper()}", 300, fetch)


# ---------------------------------------------------------------- screener (EQS)

SCREENS = {"gainers": "day_gainers", "losers": "day_losers", "actives": "most_actives"}


@app.get("/api/screener/{kind}")
def screener(kind: str):
    if kind not in SCREENS:
        raise HTTPException(400, f"kind must be one of {list(SCREENS)}")

    def fetch():
        res = yf.screen(SCREENS[kind], count=25)
        rows = []
        for q in res.get("quotes", []):
            rows.append({
                "symbol": q.get("symbol"),
                "name": q.get("shortName") or q.get("longName"),
                "price": q.get("regularMarketPrice"),
                "change": q.get("regularMarketChange"),
                "changePct": q.get("regularMarketChangePercent"),
                "volume": q.get("regularMarketVolume"),
                "marketCap": q.get("marketCap"),
            })
        return rows

    return cached(f"scr:{kind}", 120, fetch)


# ---------------------------------------------------------------- macro (ECO) — FRED, no key needed

FRED_SERIES = [
    ("CPIAUCSL", "CPI (index)", "yoy"),
    ("UNRATE", "Unemployment rate %", "last"),
    ("FEDFUNDS", "Fed funds rate %", "last"),
    ("DGS2", "US 2Y yield %", "last"),
    ("DGS10", "US 10Y yield %", "last"),
    ("DGS30", "US 30Y yield %", "last"),
    ("T10Y2Y", "10Y-2Y spread %", "last"),
    ("GDPC1", "Real GDP (bn$)", "last"),
    ("MORTGAGE30US", "30Y mortgage %", "last"),
    ("UMCSENT", "Consumer sentiment", "last"),
    ("PAYEMS", "Nonfarm payrolls (k)", "delta"),
    ("M2SL", "M2 money supply (bn$)", "yoy"),
]


def _fred_series(series_id: str) -> list[tuple[str, float]]:
    url = f"https://fred.stlouisfed.org/graph/fredgraph.csv?id={series_id}"
    r = requests.get(url, timeout=15, headers={"User-Agent": "terminal/1.0"})
    r.raise_for_status()
    out = []
    for row in csv.DictReader(io.StringIO(r.text)):
        val = row.get(series_id, "")
        if val and val != ".":
            out.append((row["observation_date"], float(val)))
    return out


def _fred_one(args):
    sid, label, mode = args
    try:
        data = _fred_series(sid)[-400:]
        if not data:
            return None
        date, last = data[-1]
        value, suffix = last, ""
        if mode == "yoy" and len(data) > 12:
            value = (last / data[-13][1] - 1) * 100
            suffix = "% YoY"
        elif mode == "delta" and len(data) > 1:
            value = last - data[-2][1]
            suffix = " m/m"
        return {
            "id": sid, "label": label, "value": round(value, 2), "suffix": suffix,
            "date": date, "spark": [v for _, v in data[-60:]],
        }
    except Exception:
        return None


@app.get("/api/eco")
def eco():
    def fetch():
        with ThreadPoolExecutor(max_workers=6) as ex:
            rows = list(ex.map(_fred_one, FRED_SERIES))
        return [r for r in rows if r]

    return cached("eco", 3600, fetch)


# ---------------------------------------------------------------- search

@app.get("/api/search")
def search(q: str):
    def fetch():
        r = requests.get(
            "https://query2.finance.yahoo.com/v1/finance/search",
            params={"q": q, "quotesCount": 8, "newsCount": 0},
            headers={"User-Agent": "Mozilla/5.0"},
            timeout=10,
        )
        r.raise_for_status()
        return [
            {
                "symbol": it.get("symbol"),
                "name": it.get("shortname") or it.get("longname"),
                "exchange": it.get("exchange"),
                "type": it.get("quoteType"),
            }
            for it in r.json().get("quotes", [])
            if it.get("symbol")
        ]

    return cached(f"s:{q.lower()}", 3600, fetch)
