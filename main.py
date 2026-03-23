# main.py — Stockwise 后端（优化版 v2）
# 安装依赖：pip3 install fastapi yfinance uvicorn "python-multipart" httpx
# 启动命令：python3 -m uvicorn main:app --reload --port 8000

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from concurrent.futures import ThreadPoolExecutor, as_completed
import yfinance as yf
import time
import httpx

app = FastAPI(title="Stockwise API")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_methods=["GET", "POST"],
    allow_headers=["*"],
)

# ── 缓存 ─────────────────────────────────────────────────────────────
_cache: dict = {}
_cache_ts: dict = {}
CACHE_TTL = 300  # 5 分钟

def cache_get(key: str):
    if key in _cache and time.time() - _cache_ts[key] < CACHE_TTL:
        return _cache[key]
    return None

def cache_set(key: str, val):
    _cache[key] = val
    _cache_ts[key] = time.time()

# ── 常量 ─────────────────────────────────────────────────────────────
ASX_SYMBOLS = {
    "BHP","CBA","CSL","RIO","NAB","WBC","ANZ","WES","MQG","TLS",
    "FMG","COL","WOW","TCL","GMG","RMD","REA","ALL","CPU","SHL",
    "VAS","NDQ","A200","STW","IOZ","VGS","VDHG","DHHF","AFI","ARG",
}

INDEX_SYMBOLS = {
    "S&P 500": "^GSPC",
    "NASDAQ":  "^IXIC",
    "ASX 200": "^AXJO",
    "AUD/USD": "AUDUSD=X",
    "黄金":    "GC=F",
    "VIX":     "^VIX",
}

# ── 工具函数 ──────────────────────────────────────────────────────────
def normalize(symbol: str) -> str:
    s = symbol.upper().strip()
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
        if v >= 1e12: return f"{v/1e12:.2f}T"
        if v >= 1e9:  return f"{v/1e9:.2f}B"
        if v >= 1e6:  return f"{v/1e6:.2f}M"
        if v >= 1e3:  return f"{v/1e3:.2f}K"
        return str(round(v))
    except:
        return "N/A"

# ── 核心数据获取（带缓存）─────────────────────────────────────────────
def fetch_stock(sym: str, display: str) -> dict:
    cached = cache_get(sym)
    if cached:
        return cached

    ticker = yf.Ticker(sym)
    info   = ticker.fast_info
    price  = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None)
    prev   = getattr(info, "previous_close", None) or getattr(info, "regularMarketPreviousClose", None)

    if price is None or prev is None:
        hist = ticker.history(period="2d")
        if len(hist) >= 2:
            price = float(hist["Close"].iloc[-1])
            prev  = float(hist["Close"].iloc[-2])
        elif len(hist) == 1:
            price = float(hist["Close"].iloc[-1])
            prev  = price

    change = round(price - prev, 4) if price and prev else 0
    pct    = round((change / prev) * 100, 2) if prev else 0
    full   = ticker.info
    name   = full.get("longName") or full.get("shortName") or display
    region = "ASX" if sym.endswith(".AX") else "US"
    is_etf = full.get("quoteType", "") in ("ETF", "MUTUALFUND")

    pre_price  = getattr(info, "pre_market_price", None)
    post_price = getattr(info, "post_market_price", None)
    def ext_pct(p):
        if p and prev:
            return round((p - prev) / prev * 100, 2)
        return None

    result = {
        "symbol":     display,
        "yahooSym":   sym,
        "name":       name,
        "price":      round(float(price), 2) if price else None,
        "change":     change,
        "pct":        pct,
        "mkt":        full.get("exchange", ""),
        "region":     region,
        "sector":     full.get("sector") or full.get("category") or ("ETF" if is_etf else "—"),
        "pe":         round(float(full.get("trailingPE")), 1) if full.get("trailingPE") else None,
        "vol":        fmt_large(full.get("regularMarketVolume") or full.get("volume")),
        "cap":        fmt_large(full.get("marketCap")),
        "isETF":      is_etf,
        "preMarket":  {"price": round(pre_price, 2) if pre_price else None,  "pct": ext_pct(pre_price)},
        "postMarket": {"price": round(post_price, 2) if post_price else None, "pct": ext_pct(post_price)},
        "error":      None,
    }
    cache_set(sym, result)
    return result

# ── /quotes：并行批量请求 ─────────────────────────────────────────────
@app.get("/quotes")
def get_quotes(symbols: str = Query(...)):
    raw_symbols = [s.strip() for s in symbols.split(",") if s.strip()]
    result = [None] * len(raw_symbols)

    def fetch_one(idx, raw):
        sym     = normalize(raw)
        display = raw.upper().replace(".AX", "")
        try:
            return idx, fetch_stock(sym, display)
        except Exception as e:
            return idx, {"symbol": display, "yahooSym": sym, "error": str(e)}

    with ThreadPoolExecutor(max_workers=10) as executor:
        futures = {executor.submit(fetch_one, i, raw): i for i, raw in enumerate(raw_symbols)}
        for future in as_completed(futures):
            idx, data = future.result()
            result[idx] = data

    return {"data": result}

# ── /indices：真实指数数据（带缓存）──────────────────────────────────
@app.get("/indices")
def get_indices():
    cached = cache_get("__indices__")
    if cached:
        return cached

    out = []
    for name, sym in INDEX_SYMBOLS.items():
        try:
            t      = yf.Ticker(sym)
            fi     = t.fast_info
            price  = getattr(fi, "last_price", None)
            prev   = getattr(fi, "previous_close", None)
            if price and prev:
                pct    = round((price - prev) / prev * 100, 2)
                prefix = "" if sym in ("AUDUSD=X", "^VIX") else "$" if sym == "GC=F" else ""
                out.append({
                    "name": name,
                    "val":  f"{prefix}{price:,.2f}",
                    "chg":  f"{'+' if pct>=0 else ''}{pct}%",
                    "pos":  pct >= 0,
                })
        except:
            pass

    cache_set("__indices__", {"data": out})
    return {"data": out}

# ── /search：模糊搜索（yf.Search + 兜底逻辑）─────────────────────────
@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    q_up = q.upper().strip()

    try:
        search_results = yf.Search(q, max_results=8).quotes
        out = []
        seen = set()
        for r in search_results:
            sym = r.get("symbol", "")
            if not sym or sym in seen:
                continue
            seen.add(sym)
            try:
                display = sym.replace(".AX", "")
                stock   = fetch_stock(sym, display)
                if stock["price"] is not None:
                    out.append(stock)
            except:
                pass
        if out:
            return {"query": q, "results": out}
    except:
        pass

    candidates = [normalize(q_up)]
    if not q_up.endswith(".AX") and "." not in q_up:
        candidates.append(q_up + ".AX")

    for sym in candidates:
        try:
            display = q_up.replace(".AX", "")
            stock   = fetch_stock(sym, display)
            if stock["price"] is not None:
                return {"query": q, "results": [stock]}
        except:
            continue

    return {"query": q, "results": [], "error": f"未找到 {q_up}，请检查代码是否正确"}

# ── /intraday：分时数据（1分钟 K 线）────────────────────────────────
@app.get("/intraday")
def get_intraday(symbol: str = Query(...)):
    sym       = normalize(symbol)
    cache_key = f"intraday_{sym}"
    cached    = cache_get(cache_key)
    if cached:
        return cached

    try:
        hist = yf.Ticker(sym).history(period="1d", interval="1m")
        data = [
            {"time": idx.strftime("%H:%M"), "close": round(float(row["Close"]), 4)}
            for idx, row in hist.iterrows()
        ]
        result = {"symbol": symbol.upper(), "data": data}
        cache_set(cache_key, result)
        return result
    except Exception as e:
        return {"symbol": symbol.upper(), "data": [], "error": str(e)}

# ── /history ─────────────────────────────────────────────────────────
@app.get("/history")
def get_history(
    symbol:   str = Query(...),
    period:   str = Query("1mo"),
    interval: str = Query("1d"),
):
    sym       = normalize(symbol)
    cache_key = f"{sym}_{period}_{interval}"
    cached    = cache_get(cache_key)
    if cached:
        return cached

    try:
        hist   = yf.Ticker(sym).history(period=period, interval=interval)
        closes = [
            {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
            for idx, row in hist.iterrows()
        ]
        result = {"symbol": symbol.upper(), "period": period, "data": closes}
        cache_set(cache_key, result)
        return result
    except Exception as e:
        return {"symbol": symbol.upper(), "error": str(e), "data": []}

# ── /health ───────────────────────────────────────────────────────────
@app.get("/health")
def health():
    return {"status": "ok"}

# ── /ai ───────────────────────────────────────────────────────────────
@app.post("/ai")
async def ai_analyse(payload: dict):
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key":         payload.get("apiKey", ""),
                    "anthropic-version": "2023-06-01",
                    "content-type":      "application/json",
                },
                json={
                    "model":      "claude-sonnet-4-20250514",
                    "max_tokens": 1000,
                    "messages":   payload.get("messages", []),
                },
            )
        return r.json()
    except Exception as e:
        return {"error": str(e)}
