const API_BASE = import.meta.env.VITE_API_BASE || "/api";

const ETF_SYMBOLS = new Set([
  "SPY","QQQ","GLD","VAS","NDQ","A200","VGS","VDHG","DHHF","IOZ","STW","QUAL","ETHI","SYI","MVW","GEAR","BBOZ",
]);

const ASX_SYMBOLS = new Set([
  "BHP","CBA","CSL","RIO","NAB","WBC","ANZ","WES","MQG","TLS",
  "FMG","WOW","XRO","GMG","RMD","VAS","NDQ","A200","VGS","VDHG",
  "DHHF","IOZ","STW","AFI","ARG","MIN","QBE","SUN","TWE","WHC",
]);

function cleanSymbol(value) {
  return String(value || "").trim().toUpperCase().replace(/\s+/g, "");
}

export function normalizeSymbol(value, preferredRegion = "AUTO") {
  const base = cleanSymbol(value).replace(/\.AX$/, "").replace(/:ASX$/, "");
  if (!base) return "";
  if (preferredRegion === "ASX" || ASX_SYMBOLS.has(base)) return `${base}.AX`;
  return base;
}

export function getDisplaySymbol(value) {
  return cleanSymbol(value).replace(/\.AX$/, "");
}

async function getJson(path, params = {}) {
  const url = new URL(`${API_BASE}${path}`, window.location.origin);
  Object.entries(params).forEach(([key, value]) => {
    if (value !== undefined && value !== null && value !== "") {
      url.searchParams.set(key, String(value));
    }
  });
  const res = await fetch(url.toString());
  const json = await res.json().catch(() => ({}));
  if (!res.ok) {
    throw new Error(json?.error || `Request failed (${res.status})`);
  }
  return json;
}

export async function fetchBatchQuotes(symbols) {
  const json = await getJson("/quotes", { symbols: symbols.join(",") });
  return json.data || [];
}

export async function fetchIndexRows() {
  const json = await getJson("/indices");
  return json.data || [];
}

export async function fetchSparkMap(symbols) {
  const json = await getJson("/sparks", { symbols: symbols.join(",") });
  return json.data || {};
}

export async function fetchSearchQuote(query, preferredRegion = "AUTO") {
  const json = await getJson("/search", { q: query, region: preferredRegion });
  return json.results?.[0] || null;
}

export async function fetchChartSeries(symbol, period) {
  const path = period === "today" ? "/intraday" : "/history";
  const json = await getJson(path, period === "today" ? { symbol } : { symbol, period });
  return {
    region: normalizeSymbol(symbol).endsWith(".AX") ? "ASX" : "US",
    points: json.data || [],
  };
}

export async function fetchNews() {
  const json = await getJson("/news");
  return json.data || [];
}

export function buildLocalAiAnalysis(stock, lang) {
  const direction = (stock?.pct ?? 0) >= 0;
  if (lang === "zh") {
    return [
      `${stock.symbol} 当前报价 ${stock.region==="ASX"?"A$":"$"}${stock.price?.toFixed(2) ?? "—"}，日内${direction ? "上涨" : "下跌"} ${Math.abs(stock.pct ?? 0).toFixed(2)}%。`,
      `近期走势上，价格动能${direction ? "偏强" : "偏弱"}，短线会继续受到财报、行业新闻和大盘风险偏好的影响。`,
      `投资逻辑方面，可重点观察 ${stock.name || stock.symbol} 的基本面兑现、成交量变化，以及市场是否继续给予当前估值支持。`,
      `主要风险包括业绩不及预期、估值回落和波动放大。`,
    ].join("");
  }
  return [
    `${stock.symbol} is trading at ${stock.region==="ASX"?"A$":"$"}${stock.price?.toFixed(2) ?? "—"}, with a daily move of ${Math.abs(stock.pct ?? 0).toFixed(2)}% ${direction ? "up" : "down"}.`,
    `Near-term momentum looks ${direction ? "constructive" : "soft"}, while sentiment is still likely to react quickly to earnings, sector headlines, and broader market risk appetite.`,
    `The key thesis depends on execution, demand resilience, and whether valuation support remains in place for ${stock.name || stock.symbol}.`,
    `Main risks include weaker-than-expected results, multiple compression, and elevated volatility.`,
  ].join(" ");
}

export const TWELVE_DATA_API_KEY = "server-managed";
export const HAS_NEWS_FEED = true;
export const HAS_MARKET_DATA = true;
export const isETF = (symbol) => ETF_SYMBOLS.has(getDisplaySymbol(symbol));
