# main.py — Stockwise 后端
# 安装依赖：pip3 install fastapi yfinance uvicorn "python-multipart" httpx
# 启动命令：python3 -m uvicorn main:app --reload --port 8000

from fastapi import FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
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
}

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

def fetch_stock(sym: str, display: str) -> dict:
    ticker = yf.Ticker(sym)
    info = ticker.fast_info
    price = getattr(info, "last_price", None) or getattr(info, "regularMarketPrice", None)
    prev  = getattr(info, "previous_close", None) or getattr(info, "regularMarketPreviousClose", None)
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
    is_etf = full.get("quoteType","") in ("ETF","MUTUALFUND")
    return {
        "symbol":   display,
        "yahooSym": sym,
        "name":     name,
        "price":    round(float(price), 2) if price else None,
        "change":   change,
        "pct":      pct,
        "mkt":      full.get("exchange",""),
        "region":   region,
        "sector":   full.get("sector") or full.get("category") or ("ETF" if is_etf else "—"),
        "pe":       round(float(full.get("trailingPE")), 1) if full.get("trailingPE") else None,
        "vol":      fmt_large(full.get("regularMarketVolume") or full.get("volume")),
        "cap":      fmt_large(full.get("marketCap")),
        "isETF":    is_etf,
        "error":    None,
    }

@app.get("/quotes")
def get_quotes(symbols: str = Query(...)):
    raw_symbols = [s.strip() for s in symbols.split(",") if s.strip()]
    result = []
    for raw in raw_symbols:
        sym     = normalize(raw)
        display = raw.upper().replace(".AX","")
        try:
            result.append(fetch_stock(sym, display))
        except Exception as e:
            result.append({"symbol": display, "yahooSym": sym, "error": str(e)})
    return {"data": result}


@app.get("/search")
def search(q: str = Query(..., min_length=1)):
    """搜索任意股票代码，直接查询 Yahoo Finance，不限制列表"""
    q_up = q.upper().strip()
    # 尝试原始代码
    candidates = [normalize(q_up)]
    # 如果不是 .AX 结尾，也尝试加 .AX
    if not q_up.endswith(".AX") and "." not in q_up:
        candidates.append(q_up + ".AX")

    for sym in candidates:
        try:
            display = q_up.replace(".AX","")
            stock   = fetch_stock(sym, display)
            if stock["price"] is not None:
                return {"query": q, "results": [stock]}
        except:
            continue

    return {"query": q, "results": [], "error": f"未找到 {q_up}，请检查代码是否正确"}


@app.get("/history")
def get_history(
    symbol: str = Query(...),
    period: str = Query("1mo"),
    interval: str = Query("1d"),
):
    sym = normalize(symbol)
    try:
        hist = yf.Ticker(sym).history(period=period, interval=interval)
        closes = [
            {"date": str(idx.date()), "close": round(float(row["Close"]), 4)}
            for idx, row in hist.iterrows()
        ]
        return {"symbol": symbol.upper(), "period": period, "data": closes}
    except Exception as e:
        return {"symbol": symbol.upper(), "error": str(e), "data": []}


@app.get("/health")
def health():
    return {"status": "ok"}


@app.post("/ai")
async def ai_analyse(payload: dict):
    """转发 AI 分析请求到 Anthropic，避免前端 CORS 问题"""
    import httpx
    try:
        async with httpx.AsyncClient(timeout=60) as client:
            r = await client.post(
                "https://api.anthropic.com/v1/messages",
                headers={
                    "x-api-key": payload.get("apiKey", ""),
                    "anthropic-version": "2023-06-01",
                    "content-type": "application/json",
                },
                json={
                    "model": "claude-sonnet-4-20250514",
                    "max_tokens": 1000,
                    "messages": payload.get("messages", []),
                },
            )
        return r.json()
    except Exception as e:
        return {"error": str(e)}
