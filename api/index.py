from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed
import gc
import time
from threading import Lock
from zoneinfo import ZoneInfo
import urllib.request
import xml.etree.ElementTree as ET
from email.utils import parsedate_to_datetime
from typing import List, Optional
import yfinance as yf

app = FastAPI(title="Stockwise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET"],
    allow_headers=["*"],
)

ASX_SYMBOLS = {
    "BHP","CBA","CSL","RIO","NAB","WBC","ANZ","WES","MQG","TLS",
    "FMG","COL","WOW","TCL","GMG","RMD","REA","ALL","CPU","SHL",
    "VAS","NDQ","A200","STW","IOZ","VGS","VDHG","DHHF","AFI","ARG",
    "ASX","BEN","BOQ","BSL","CAR","CHC","CIM","CWY","DXS","EBO",
    "EVN","IAG","IEL","IFL","IGO","JBH","LLC","LNK","MGR","MIN",
    "MPL","MTS","NEC","NST","NXT","ORI","OZL","PLS","PMV","QAN",
    "QBE","RHC","S32","SCG","SEK","SGP","STO","SUN","SVW","TAH",
    "TWE","URW","VCX","VEA","WHC","WPL","XRO","Z1P",
    "QUAL","ETHI","MNRS","HVST","SYI","MVW","GEAR","BBOZ",
}

QUOTE_CACHE_TTL = 30
INDICES_CACHE_TTL = 120
NEWS_CACHE_TTL = 300
SPARKS_CACHE_TTL = 120
_cache_lock = Lock()
_cache = {}


def cache_get(key: str):
    with _cache_lock:
        entry = _cache.get(key)
        if not entry:
            return None
        if entry["expires_at"] <= time.time():
            _cache.pop(key, None)
            return None
        return entry["value"]


def cache_set(key: str, value, ttl: int):
    with _cache_lock:
        _cache[key] = {"value": value, "expires_at": time.time() + ttl}


def normalize(symbol: str) -> str:
    s = (symbol or "").upper().strip()
    if not s:
        return ""
    if s.endswith(".AX") or "." in s:
        return s
    if s in ASX_SYMBOLS:
        return s + ".AX"
    return s


def fmt_large(val) -> str:
    if val is None:
        return "N/A"
    try:
        v = float(val)
        if v >= 1e12:
            return f"{v/1e12:.2f}T"
        if v >= 1e9:
            return f"{v/1e9:.2f}B"
        if v >= 1e6:
            return f"{v/1e6:.2f}M"
        if v >= 1e3:
            return f"{v/1e3:.2f}K"
        return str(round(v))
    except:
        return "N/A"


def _fast_value(info, *names):
    for name in names:
        val = getattr(info, name, None)
        if val is not None:
            return val
    return None


def fetch_stock(sym: str, display: str, include_meta: bool = False) -> dict:
    ticker = yf.Ticker(sym)
    info = ticker.fast_info
    price = _fast_value(info, "last_price", "regularMarketPrice")
    prev = _fast_value(info, "previous_close", "regularMarketPreviousClose")

    if price is None or prev is None:
        hist = ticker.history(period="5d")
        closes = hist["Close"].dropna() if not hist.empty else []
        if len(closes) >= 2:
            price = float(closes.iloc[-1])
            prev = float(closes.iloc[-2])
        elif len(closes) == 1:
            price = float(closes.iloc[-1])
            prev = price

    if price is None:
        raise ValueError(f"No price for {sym}")

    change = round(price - prev, 4) if prev else 0
    pct = round((change / prev) * 100, 2) if prev else 0
    region = "ASX" if sym.endswith(".AX") else "US"
    exchange = _fast_value(info, "exchange", "market")
    market_cap = _fast_value(info, "market_cap")
    volume = _fast_value(info, "last_volume", "regularMarketVolume")
    quote_type = (_fast_value(info, "quote_type") or "").upper()
    is_etf = quote_type in ("ETF", "MUTUALFUND") or display in {
        "SPY","QQQ","GLD","VAS","NDQ","A200","VGS","VDHG","DHHF","IOZ","STW","QUAL","ETHI","SYI","MVW","GEAR","BBOZ"
    }

    name = display
    sector = "ETF" if is_etf else "—"
    pe = None
    pre_price = _fast_value(info, "pre_market_price", "preMarketPrice")
    post_price = _fast_value(info, "post_market_price", "postMarketPrice")

    if include_meta:
        full = ticker.info or {}
        name = full.get("longName") or full.get("shortName") or name
        sector = full.get("sector") or full.get("category") or sector
        pe_raw = full.get("trailingPE")
        pe = round(float(pe_raw), 1) if pe_raw else None
        exchange = full.get("exchange") or exchange or ""
        market_cap = full.get("marketCap") or market_cap
        volume = full.get("regularMarketVolume") or full.get("volume") or volume
        pre_price = full.get("preMarketPrice") or pre_price
        post_price = full.get("postMarketPrice") or post_price
    else:
        exchange = exchange or ("ASX" if region == "ASX" else "NASDAQ/NYSE")

    pre_pct = round((pre_price - price) / price * 100, 2) if pre_price and price else None
    post_pct = round((post_price - price) / price * 100, 2) if post_price and price else None

    gc.collect()
    return {
        "symbol": display,
        "yahooSym": sym,
        "name": name,
        "price": round(float(price), 2) if price else None,
        "change": change,
        "pct": pct,
        "mkt": exchange or "",
        "region": region,
        "sector": sector,
        "pe": pe,
        "vol": fmt_large(volume),
        "cap": fmt_large(market_cap),
        "isETF": is_etf,
        "preMarket": {"price": pre_price, "pct": pre_pct},
        "postMarket": {"price": post_price, "pct": post_pct},
        "error": None,
    }


def fetch_stock_fallback(sym: str, display: str) -> dict:
    ticker = yf.Ticker(sym)
    hist = ticker.history(period="5d")
    if hist.empty:
        raise ValueError(f"No price history for {sym}")
    closes = hist["Close"].dropna()
    if closes.empty:
        raise ValueError(f"No close data for {sym}")

    price = float(closes.iloc[-1])
    prev = float(closes.iloc[-2]) if len(closes) >= 2 else price
    change = round(price - prev, 4)
    pct = round((change / prev) * 100, 2) if prev else 0

    try:
        full = ticker.info or {}
    except:
        full = {}

    region = "ASX" if sym.endswith(".AX") else "US"
    quote_type = (full.get("quoteType") or "").upper()
    is_etf = quote_type in ("ETF", "MUTUALFUND")

    gc.collect()
    return {
        "symbol": display,
        "yahooSym": sym,
        "name": full.get("longName") or full.get("shortName") or display,
        "price": round(price, 2),
        "change": change,
        "pct": pct,
        "mkt": full.get("exchange") or ("ASX" if region == "ASX" else "US"),
        "region": region,
        "sector": full.get("sector") or full.get("category") or ("ETF" if is_etf else "—"),
        "pe": round(float(full.get("trailingPE")), 1) if full.get("trailingPE") else None,
        "vol": fmt_large(full.get("regularMarketVolume") or full.get("volume")),
        "cap": fmt_large(full.get("marketCap")),
        "isETF": is_etf,
        "preMarket": {"price": full.get("preMarketPrice"), "pct": None},
        "postMarket": {"price": full.get("postMarketPrice"), "pct": None},
        "error": None,
    }


def search_symbols(q_up: str) -> List[str]:
    candidates = []
    seen = set()

    def add(sym: str):
        sym = (sym or "").upper().strip()
        if not sym or sym in seen:
            return
        seen.add(sym)
        candidates.append(sym)

    add(normalize(q_up))
    if not q_up.endswith(".AX") and "." not in q_up:
        add(q_up)
        add(q_up + ".AX")

    try:
        search = yf.Search(q_up, max_results=8)
        for quote in getattr(search, "quotes", []) or []:
            add(quote.get("symbol"))
    except:
        pass

    return candidates


def fetch_index_snapshot(sym: str, name: str) -> Optional[dict]:
    ticker = yf.Ticker(sym)
    try:
        fi = ticker.fast_info
        price = _fast_value(fi, "last_price", "regularMarketPrice")
        prev = _fast_value(fi, "previous_close", "regularMarketPreviousClose")
        if price is not None and prev is not None:
            chg = price - prev
            pct = chg / prev * 100 if prev else 0
            return {"name": name, "val": f"{float(price):,.2f}", "chg": f"{pct:+.2f}%", "pos": chg >= 0}
    except:
        pass
    try:
        hist = ticker.history(period="5d")
        closes = hist["Close"].dropna()
        if len(closes) >= 2:
            price = float(closes.iloc[-1])
            prev = float(closes.iloc[-2])
            chg = price - prev
            pct = chg / prev * 100 if prev else 0
            return {"name": name, "val": f"{price:,.2f}", "chg": f"{pct:+.2f}%", "pos": chg >= 0}
    except:
        pass
    return None


def fetch_spark_batch(raw_symbols: List[str]) -> dict:
    cache_key = "sparks:" + ",".join(raw_symbols)
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}

    pairs = [(raw.upper().replace(".AX", ""), normalize(raw)) for raw in raw_symbols]
    tickers = [sym for _, sym in pairs]
    result = {display: [] for display, _ in pairs}
    try:
        hist = yf.download(
            tickers=tickers,
            period="1d",
            interval="5m",
            group_by="ticker",
            auto_adjust=False,
            progress=False,
            threads=True,
        )
        if len(tickers) == 1:
            display, _ = pairs[0]
            closes = hist["Close"].dropna().tolist() if "Close" in hist else []
            result[display] = [round(float(v), 4) for v in closes[-24:]]
        else:
            for display, sym in pairs:
                try:
                    closes = hist[sym]["Close"].dropna().tolist()
                    result[display] = [round(float(v), 4) for v in closes[-24:]]
                except:
                    result[display] = []
    except:
        pass
    cache_set(cache_key, result, SPARKS_CACHE_TTL)
    return {"data": result, "cached": False}


@app.get("/quotes")
def get_quotes(symbols: str = Query(...)):
    raw_symbols = [s.strip() for s in symbols.split(",") if s.strip()]
    cache_key = "quotes:" + ",".join(raw_symbols)
    cached = cache_get(cache_key)
    if cached is not None:
        return {"data": cached, "cached": True}

    results_map = {}

    def fetch_one(raw):
        sym = normalize(raw)
        display = raw.upper().replace(".AX", "")
        try:
            return display, fetch_stock(sym, display, include_meta=False)
        except Exception:
            try:
                return display, fetch_stock_fallback(sym, display)
            except Exception as e:
                return display, {"symbol": display, "yahooSym": sym, "error": str(e)}

    with ThreadPoolExecutor(max_workers=8) as ex:
        futures = {ex.submit(fetch_one, raw): raw for raw in raw_symbols}
        for f in as_completed(futures):
            display, data = f.result()
            results_map[display] = data

    result = [results_map[r.upper().replace(".AX", "")] for r in raw_symbols if r.upper().replace(".AX", "") in results_map]
    cache_set(cache_key, result, QUOTE_CACHE_TTL)
    return {"data": result, "cached": False}


@app.get("/search")
def search(q: str = Query(..., min_length=1), region: str = Query("AUTO")):
    q_up = q.upper().strip()
    candidates = search_symbols(q_up)
    if region == "ASX":
        candidates = sorted(candidates, key=lambda s: 0 if s.endswith(".AX") else 1)
    for sym in candidates:
        display = sym.replace(".AX", "")
        try:
            stock = fetch_stock(sym, display, include_meta=True)
            if stock["price"] is not None:
                return {"query": q, "results": [stock]}
        except:
            try:
                stock = fetch_stock_fallback(sym, display)
                if stock["price"] is not None:
                    return {"query": q, "results": [stock]}
            except:
                continue
    return {"query": q, "results": [], "error": f"未找到 {q_up}"}


@app.get("/history")
def get_history(symbol: str = Query(...), period: str = Query("1mo"), interval: str = Query("1d")):
    sym = normalize(symbol)
    try:
        hist = yf.Ticker(sym).history(period=period, interval=interval)
        closes = [{"date": str(idx.date()), "close": round(float(row["Close"]), 4)} for idx, row in hist.iterrows()]
        gc.collect()
        return {"symbol": symbol.upper(), "period": period, "data": closes}
    except Exception as e:
        return {"symbol": symbol.upper(), "error": str(e), "data": []}


@app.get("/intraday")
def get_intraday(symbol: str = Query(...)):
    sym = normalize(symbol)
    try:
        market_tz = ZoneInfo("Australia/Sydney") if sym.endswith(".AX") else ZoneInfo("America/New_York")
        hist = yf.Ticker(sym).history(period="2d", interval="5m")
        if hist.empty:
            return {"symbol": symbol.upper(), "data": []}
        idx = hist.index
        if getattr(idx, "tz", None) is not None:
            hist.index = idx.tz_convert(market_tz)
        latest_session = hist.index[-1].date()
        hist = hist[hist.index.date == latest_session]
        data = [{"time": idx.strftime("%H:%M"), "close": round(float(row["Close"]), 4)} for idx, row in hist.iterrows()]
        gc.collect()
        return {"symbol": symbol.upper(), "data": data}
    except Exception as e:
        return {"symbol": symbol.upper(), "error": str(e), "data": []}


@app.get("/indices")
def get_indices():
    cached = cache_get("indices")
    if cached is not None:
        return {"data": cached, "cached": True}
    index_map = [
        ("^GSPC", "S&P 500"),
        ("^IXIC", "NASDAQ"),
        ("^AXJO", "ASX 200"),
        ("GC=F", "Gold"),
    ]
    results = []
    for sym, name in index_map:
        item = fetch_index_snapshot(sym, name)
        if item is not None:
            results.append(item)
    cache_set("indices", results, INDICES_CACHE_TTL)
    return {"data": results, "cached": False}


@app.get("/sparks")
def get_sparks(symbols: str = Query(...)):
    raw_symbols = [s.strip() for s in symbols.split(",") if s.strip()]
    return fetch_spark_batch(raw_symbols)


@app.get("/news")
def get_news():
    cached = cache_get("news")
    if cached is not None:
        return {"data": cached, "cached": True}
    rss_feeds = [
        ("https://feeds.finance.yahoo.com/rss/2.0/headline?s=AAPL,NVDA,TSLA,AMZN,META&region=US&lang=en-US", "US"),
        ("https://feeds.finance.yahoo.com/rss/2.0/headline?s=BHP.AX,CBA.AX,CSL.AX,XRO.AX&region=AU&lang=en-AU", "ASX"),
    ]
    all_news = []
    seen = set()
    for url, region in rss_feeds:
        try:
            req = urllib.request.Request(url, headers={"User-Agent": "Mozilla/5.0"})
            with urllib.request.urlopen(req, timeout=8) as r:
                xml_data = r.read()
            root_el = ET.fromstring(xml_data)
            for item in root_el.findall(".//item")[:15]:
                title = item.findtext("title", "").strip()
                if not title or title in seen:
                    continue
                seen.add(title)
                link = item.findtext("link", "")
                source = item.findtext("source", "Yahoo Finance")
                pub = item.findtext("pubDate", "")
                ts = 0
                try:
                    ts = int(parsedate_to_datetime(pub).timestamp())
                except:
                    pass
                sym = "MARKET"
                for code in ["AAPL","NVDA","TSLA","AMZN","META","BHP","CBA","CSL","XRO","MSFT","GOOGL"]:
                    if code in title.upper():
                        sym = code
                        break
                all_news.append({
                    "title": title,
                    "link": link,
                    "source": source or "Yahoo Finance",
                    "symbol": sym,
                    "region": region,
                    "published": ts,
                    "thumb": None,
                })
        except:
            continue
    all_news.sort(key=lambda x: x["published"], reverse=True)
    result = all_news[:40]
    cache_set("news", result, NEWS_CACHE_TTL)
    return {"data": result, "cached": False}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.get("/")
def root():
    return {"status": "ok", "service": "Stockwise API"}
