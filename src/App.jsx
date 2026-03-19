import { useState, useEffect, useCallback } from "react";

const API = "https://stockwise-76dt.onrender.com";

const C = {
  bg:"#f9fafb", bg2:"#f3f4f6", card:"#ffffff",
  border:"#e5e7eb", border2:"#d1d5db",
  accent:"#111827", accentL:"#374151",
  gold:"#b8933e", goldBg:"#fefce8", goldBd:"#fde68a",
  text:"#111827", text2:"#374151", text3:"#6b7280", text4:"#9ca3af",
  green:"#16a34a", greenBg:"#f0fdf4", greenBd:"#bbf7d0",
  red:"#dc2626",   redBg:"#fef2f2",   redBd:"#fecaca",
};

const DEFAULT_SYMBOLS = [
  "AAPL","NVDA","MSFT","TSLA","AMZN","META",
  "SPY","QQQ","VTI","IVV",
  "BHP","CBA","CSL","RIO","NAB","WBC",
  "VAS","NDQ","A200",
];

const T = {
  zh:{
    brand:"Stockwise",
    searchPh:"输入任意代码按 Enter 搜索，如 CTT、GOOG、700.HK…",
    simulated:"延迟行情", tabMarket:"市场", tabWatch:"自选股", tabEtf:"ETF",
    all:"全部", us:"🇺🇸 美股", asx:"🇦🇺 澳股", stocks:"个股", etf:"ETF",
    results:(n)=>`${n} 条结果`,
    colSymbol:"代码", colName:"名称", colPrice:"价格", colChange:"涨跌幅",
    colTrend:"走势", colVol:"成交量", colCap:"市值",
    watchTitle:"自选股", watchSub:"点击 ★ 添加或移除",
    watchEmpty:"暂无自选股", etfTitle:"ETF 筛选器", etfSub:"美股 & 澳股 ETF",
    scale:"规模", mktCap:"市值", vol:"成交量", pe:"市盈率",
    exchange:"交易所", sector:"板块", type:"类型", etfType:"ETF", stockType:"个股",
    aiTitle:"AI 分析", aiGenerate:"生成分析 →",
    aiHint:"点击生成，Claude AI 将分析近期表现、投资逻辑与主要风险。",
    aiAnalyzing:["分析财务数据…","获取市场情绪…","生成报告…"],
    aiRetry:"↻ 重新分析", addWatch:"☆ 加入自选", inWatch:"★ 已加自选",
    na:"N/A", gold:"黄金",
    loading:"加载中…", error:"数据加载失败", retry:"重试",
    backendTip:"请确认后端已启动：python3 -m uvicorn main:app --reload",
    refreshing:"更新中…", lastUpdated:"更新于",
    searching:"搜索中…", searchNotFound:"未找到该股票",
    aiKeyTitle:"输入 Anthropic API Key",
    aiKeyDesc:"AI 分析需要你自己的 API Key，前往 console.anthropic.com 获取。",
    aiKeyPlaceholder:"sk-ant-...",
    aiKeyCancel:"取消", aiKeyConfirm:"确认并分析",
    aiPrompt:(s)=>`你是一位专业的证券分析师。请用简洁的中文（约200字）分析：\n股票：${s.name}（${s.symbol}）| 市场：${s.mkt} | 板块：${s.sector}\n价格：${s.price} | 涨跌：${s.pct}% | 市值：${s.cap}${s.pe?` | P/E：${s.pe}`:"（ETF）"}\n\n分析：1）近期表现 2）核心投资逻辑 3）主要风险。专业客观。`,
  },
  en:{
    brand:"Stockwise",
    searchPh:"Type any symbol and press Enter, e.g. CTT, GOOG, 700.HK…",
    simulated:"Delayed", tabMarket:"Market", tabWatch:"Watchlist", tabEtf:"ETFs",
    all:"All", us:"🇺🇸 US", asx:"🇦🇺 ASX", stocks:"Stocks", etf:"ETF",
    results:(n)=>`${n} results`,
    colSymbol:"Symbol", colName:"Name", colPrice:"Price", colChange:"Change",
    colTrend:"Trend", colVol:"Volume", colCap:"Mkt Cap",
    watchTitle:"Watchlist", watchSub:"Click ★ to add or remove",
    watchEmpty:"No stocks in watchlist", etfTitle:"ETF Explorer", etfSub:"US & ASX ETFs",
    scale:"AUM", mktCap:"Mkt Cap", vol:"Volume", pe:"P/E",
    exchange:"Exchange", sector:"Sector", type:"Type", etfType:"ETF", stockType:"Stock",
    aiTitle:"AI Analysis", aiGenerate:"Analyse →",
    aiHint:"Click to generate — Claude AI will assess performance, thesis and risks.",
    aiAnalyzing:["Analysing financials…","Reading sentiment…","Generating report…"],
    aiRetry:"↻ Re-analyse", addWatch:"☆ Watchlist", inWatch:"★ Watching",
    na:"N/A", gold:"Gold",
    loading:"Loading…", error:"Failed to load data", retry:"Retry",
    backendTip:"Make sure backend is running: python3 -m uvicorn main:app --reload",
    refreshing:"Refreshing…", lastUpdated:"Updated",
    searching:"Searching…", searchNotFound:"Symbol not found",
    aiKeyTitle:"Enter Anthropic API Key",
    aiKeyDesc:"AI analysis requires your own API Key from console.anthropic.com",
    aiKeyPlaceholder:"sk-ant-...",
    aiKeyCancel:"Cancel", aiKeyConfirm:"Confirm & Analyse",
    aiPrompt:(s)=>`You are a professional securities analyst. Provide a concise analysis (~150 words) of:\nStock: ${s.name} (${s.symbol}) | Market: ${s.mkt} | Sector: ${s.sector}\nPrice: ${s.price} | Change: ${s.pct}% | Mkt Cap: ${s.cap}${s.pe?` | P/E: ${s.pe}`:" (ETF)"}\n\nCover: 1) Recent performance 2) Investment thesis 3) Key risks. Professional and objective.`,
  },
};

const INDICES = (t) => [
  {name:"S&P 500",val:"5,224.62",chg:"+0.44%",pos:true},
  {name:"NASDAQ", val:"16,372",  chg:"+0.93%",pos:true},
  {name:"ASX 200",val:"7,842.30",chg:"+0.68%",pos:true},
  {name:"AUD/USD",val:"0.6531",  chg:"+0.12%",pos:true},
  {name:t.gold,   val:"$2,314",  chg:"+0.31%",pos:true},
  {name:"VIX",    val:"14.82",   chg:"−3.5%", pos:true},
];

const sparkCache = {};
function getSpark(symbol, price) {
  if (!sparkCache[symbol]) {
    const d = []; let p = (price || 100) * 0.97;
    for (let i = 0; i < 24; i++) { p += (Math.random() - 0.47) * (price||100) * 0.009; d.push(p); }
    d[d.length - 1] = price || 100;
    sparkCache[symbol] = d;
  }
  return sparkCache[symbol];
}

function Spark({ symbol, price, pos, w = 72, h = 28 }) {
  const data = getSpark(symbol, price);
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const pts = data.map((v, i) => `${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(" ");
  return (
    <svg width={w} height={h} style={{ display:"block" }}>
      <polyline points={pts} fill="none" stroke={pos ? C.green : C.red} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function AreaChart({ closes, pos, h = 110 }) {
  if (!closes || closes.length < 2) {
    return <div style={{ height:h, display:"flex", alignItems:"center", justifyContent:"center", color:C.text4, fontSize:13 }}>暂无数据</div>;
  }
  const data = closes.map(d => d.close);
  const mn = Math.min(...data), mx = Math.max(...data), rng = mx - mn || 1;
  const W = 560;
  const pts = data.map((v, i) => [(i/(data.length-1))*W, h-((v-mn)/rng)*(h-12)-6]);
  const line = pts.map(p => p.join(",")).join(" ");
  const area = `0,${h} ${line} ${W},${h}`;
  const c = pos ? C.green : C.red;
  const id = `ag${Math.random().toString(36).slice(2)}`;
  return (
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{ height:h, display:"block" }}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.15"/>
          <stop offset="100%" stopColor={c} stopOpacity="0"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`}/>
      <polyline points={line} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

function Skeleton({ w="100%", h=14, r=4 }) {
  return <div style={{ width:w, height:h, borderRadius:r, background:`linear-gradient(90deg,${C.bg2} 25%,${C.border} 50%,${C.bg2} 75%)`, backgroundSize:"200% 100%", animation:"shimmer 1.3s infinite" }}/>;
}

export default function App() {
  const [lang, setLang]         = useState("zh");
  const [tab, setTab]           = useState("market");
  const [region, setReg]        = useState("ALL");
  const [typeF, setTypeF]       = useState("ALL");
  const [query, setQuery]       = useState("");
  const [sort, setSort]         = useState({ col:"cap", dir:-1 });
  const [watch, setWatch]       = useState(["AAPL","BHP","SPY","VAS","NVDA"]);
  const [modal, setModal]       = useState(null);
  const [history, setHist]      = useState([]);
  const [histPeriod, setHP]     = useState("1mo");
  const [aiText, setAiT]        = useState("");
  const [aiLoad, setAiL]        = useState(false);
  const [aiMsg, setAiMsg]       = useState("");
  const [stocks, setStocks]     = useState([]);
  const [extraStocks, setExtra] = useState([]);
  const [loading, setLoad]      = useState(true);
  const [error, setError]       = useState(null);
  const [lastUpd, setLastU]     = useState(null);
  const [refreshing, setRef]    = useState(false);
  const [searching, setSrch]    = useState(false);
  const [searchErr, setSErr]    = useState(null);
  const [apiKey, setApiKey]     = useState("");
  const [showKey, setShowKey]   = useState(false);
  const [pendingAI, setPendingAI] = useState(null);

  const t = T[lang];

  const fetchQuotes = useCallback(async (isRefresh = false) => {
    if (isRefresh) setRef(true); else setLoad(true);
    setError(null);
    try {
      const res = await fetch(`${API}/quotes?symbols=${DEFAULT_SYMBOLS.join(",")}`);
      if (!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStocks(json.data.filter(s => s.price != null && !s.error));
      setLastU(new Date());
    } catch(e) { setError(e.message); }
    finally { setLoad(false); setRef(false); }
  }, []);

  useEffect(() => { fetchQuotes(); }, [fetchQuotes]);
  useEffect(() => {
    const iv = setInterval(() => fetchQuotes(true), 60000);
    return () => clearInterval(iv);
  }, [fetchQuotes]);

  useEffect(() => {
    if (!modal) return;
    setHist([]);
    const sym = modal.yahooSym || modal.symbol;
    fetch(`${API}/history?symbol=${sym}&period=${histPeriod}`)
      .then(r => r.json()).then(j => setHist(j.data || [])).catch(() => setHist([]));
  }, [modal, histPeriod]);

  const handleSearch = async (e) => {
    if (e.key !== "Enter" || !query.trim()) return;
    setSrch(true); setSErr(null);
    try {
      const res  = await fetch(`${API}/search?q=${encodeURIComponent(query.trim())}`);
      const json = await res.json();
      if (json.results && json.results.length > 0) {
        const found = json.results[0];
        // add to top of list only, don't open modal
        setExtra(prev => prev.find(s => s.symbol === found.symbol) ? prev : [found, ...prev]);
      } else {
        setSErr(json.error || t.searchNotFound);
      }
    } catch(e) { setSErr(e.message); }
    finally { setSrch(false); }
  };

  const pn = v => parseFloat(String(v).replace(/[^0-9.]/g, "")) || 0;
  const allStocks = [...extraStocks, ...stocks.filter(s => !extraStocks.find(e => e.symbol === s.symbol))];
  const visible = allStocks.filter(s => {
    const mr = region === "ALL" || s.region === region;
    const mt = typeF === "ALL" || (typeF === "ETF" && s.isETF) || (typeF === "STOCK" && !s.isETF);
    const mq = !query || s.symbol.toLowerCase().includes(query.toLowerCase()) || s.name.toLowerCase().includes(query.toLowerCase());
    return mr && mt && mq;
  }).sort((a, b) => {
    if (sort.col === "symbol") return sort.dir * (a.symbol < b.symbol ? -1 : 1);
    if (sort.col === "pct")    return sort.dir * (a.pct - b.pct);
    if (sort.col === "price")  return sort.dir * (a.price - b.price);
    if (sort.col === "vol")    return sort.dir * (pn(a.vol) - pn(b.vol));
    if (sort.col === "cap") {
      if (region === "ALL" && a.region !== b.region) return a.region === "US" ? -1 : 1;
      return sort.dir * (pn(a.cap) - pn(b.cap));
    }
    return 0;
  });

  const setSort2 = col => setSort(p => p.col === col ? { ...p, dir:-p.dir } : { col, dir:-1 });
  const Arr = ({ col }) => sort.col !== col
    ? <span style={{ color:C.text4, marginLeft:3, fontSize:10 }}>↕</span>
    : <span style={{ color:C.text, marginLeft:3, fontSize:10 }}>{sort.dir === -1 ? "↓" : "↑"}</span>;

  const toggleWatch = sym => setWatch(p => p.includes(sym) ? p.filter(s => s !== sym) : [...p, sym]);
  const openModal   = s => { setModal(s); setAiT(""); setHP("1mo"); };

  const doAI = async (stock, key) => {
    setAiT(""); setAiL(true);
    const msgs = t.aiAnalyzing; let i = 0; setAiMsg(msgs[0]);
    const iv = setInterval(() => { i = (i+1) % msgs.length; setAiMsg(msgs[i]); }, 1100);
    try {
      const r = await fetch(`${API}/ai`, {
        method:"POST", headers:{ "Content-Type":"application/json" },
        body: JSON.stringify({ apiKey: key, messages:[{ role:"user", content:t.aiPrompt(stock) }] })
      });
      const d = await r.json();
      if (d.error) throw new Error(d.error);
      setAiT(d.content?.map(b => b.text || "").join("") || t.na);
    } catch(e) { setAiT(lang === "zh" ? `分析失败: ${e.message}` : `Failed: ${e.message}`); }
    finally { clearInterval(iv); setAiL(false); }
  };

  const runAI = (stock) => {
    if (!apiKey) { setPendingAI(stock); setShowKey(true); return; }
    doAI(stock, apiKey);
  };

  const confirmKey = (key) => {
    setApiKey(key);
    setShowKey(false);
    if (pendingAI) { doAI(pendingAI, key); setPendingAI(null); }
  };

  const cardBase = { background:C.card, border:`1px solid ${C.border}`, borderRadius:12, boxShadow:"0 1px 3px rgba(0,0,0,0.05)" };
  const segPill  = active => ({
    padding:"5px 14px", borderRadius:7, fontSize:13, fontFamily:"inherit", cursor:"pointer", border:"none",
    background: active ? C.card : "transparent",
    color:      active ? C.text : C.text3,
    fontWeight: active ? 600 : 400,
    boxShadow:  active ? "0 1px 3px rgba(0,0,0,0.08)" : "none",
  });
  const chgBadge = pct => ({
    display:"inline-flex", alignItems:"center", gap:3,
    background: pct >= 0 ? C.greenBg : C.redBg,
    color:      pct >= 0 ? C.green   : C.red,
    border:`1px solid ${pct >= 0 ? C.greenBd : C.redBd}`,
    padding:"3px 9px", borderRadius:20, fontSize:12, fontWeight:700,
    fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap",
  });

  const css = `
    @import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&family=Playfair+Display:wght@700&display=swap');
    *,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
    body{background:${C.bg}}
    ::-webkit-scrollbar{width:5px;height:5px}
    ::-webkit-scrollbar-track{background:${C.bg}}
    ::-webkit-scrollbar-thumb{background:${C.border2};border-radius:4px}
    input::placeholder{color:${C.text4}}
    input:focus{outline:none;border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(17,24,39,0.08)}
    .tr{transition:background 0.1s;cursor:pointer}
    .tr:hover{background:${C.bg}!important}
    .tab{border:none;background:none;font-family:inherit;cursor:pointer;transition:all 0.12s}
    .tab:hover{color:${C.text}!important}
    .seg{transition:all 0.12s;user-select:none}
    .seg:hover{opacity:0.8}
    .hcard{transition:all 0.16s;cursor:pointer}
    .hcard:hover{box-shadow:0 4px 20px rgba(0,0,0,0.10)!important;transform:translateY(-1px)}
    .star{cursor:pointer;transition:transform 0.15s;user-select:none;display:inline-block}
    .star:hover{transform:scale(1.2)}
    .th{cursor:pointer;user-select:none}
    .th:hover{color:${C.text}!important}
    .ai-btn{transition:all 0.15s;cursor:pointer;border:none}
    .ai-btn:hover{background:${C.accentL}!important}
    .period-btn{transition:all 0.12s;cursor:pointer;border:none;font-family:inherit}
    .period-btn:hover{background:${C.bg2}!important}
    @keyframes spin{to{transform:rotate(360deg)}}
    @keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
    .fu{animation:fu 0.24s ease forwards}
    @keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
    @media(max-width:768px){
      .mobile-hide{display:none!important}
      .mobile-scroll{overflow-x:auto;-webkit-overflow-scrolling:touch}
      .mobile-bottom-nav{display:flex!important}
      main{padding-bottom:70px!important}
    }
  `;

  return (
    <div style={{ fontFamily:"'Inter',sans-serif", background:C.bg, minHeight:"100vh", color:C.text }}>
      <style>{css}</style>

      {/* HEADER */}
      <header style={{ background:C.card, borderBottom:`1px solid ${C.border}`, padding:"0 16px", height:56, display:"flex", alignItems:"center", gap:12, position:"sticky", top:0, zIndex:50, boxShadow:"0 1px 3px rgba(0,0,0,0.04)" }}>
        <div style={{ display:"flex", alignItems:"center", gap:9, flexShrink:0 }}>
          <div style={{ width:28, height:28, background:C.accent, borderRadius:7, display:"flex", alignItems:"center", justifyContent:"center" }}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <polyline points="1,12 5,7 9,9 15,3" stroke="#fff" strokeWidth="1.8" strokeLinejoin="round" strokeLinecap="round"/>
              <circle cx="15" cy="3" r="1.5" fill="#fbbf24"/>
            </svg>
          </div>
          <span style={{ fontFamily:"'Playfair Display',serif", fontWeight:700, fontSize:18, color:C.text }}>Stockwise</span>
        </div>

        <div style={{ flex:1, maxWidth:480, position:"relative" }}>
          <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke={C.text4} strokeWidth="2" strokeLinecap="round" style={{ position:"absolute", left:11, top:"50%", transform:"translateY(-50%)" }}>
            <circle cx="11" cy="11" r="8"/><path d="M21 21l-4.35-4.35"/>
          </svg>
          <input
            value={query}
            onChange={e => { setQuery(e.target.value); setSErr(null); }}
            onKeyDown={handleSearch}
            placeholder={t.searchPh}
            style={{ width:"100%", background:C.bg, border:`1px solid ${C.border}`, borderRadius:8, padding:"8px 32px 8px 32px", color:C.text, fontSize:13, fontFamily:"inherit" }}
          />
          {query && <button onClick={() => { setQuery(""); setSErr(null); }} style={{ position:"absolute", right:9, top:"50%", transform:"translateY(-50%)", background:"none", border:"none", cursor:"pointer", color:C.text4, fontSize:18, lineHeight:1, padding:0 }}>×</button>}
        </div>
        {searching && <span style={{ fontSize:12, color:C.text3, flexShrink:0 }}>{t.searching}</span>}
        {searchErr  && <span style={{ fontSize:12, color:C.red,   flexShrink:0 }}>{searchErr}</span>}

        <nav className="mobile-hide" style={{ display:"flex", gap:1, marginLeft:"auto" }}>
          {[["market",t.tabMarket],["watchlist",t.tabWatch],["etf",t.tabEtf]].map(([id,lbl]) => (
            <button key={id} className="tab" onClick={() => setTab(id)}
              style={{ padding:"6px 16px", fontSize:14, fontWeight:tab===id?600:400, color:tab===id?C.text:C.text3, borderBottom:tab===id?`2px solid ${C.text}`:"2px solid transparent", paddingBottom:tab===id?4:6 }}>
              {lbl}
            </button>
          ))}
        </nav>

        <button onClick={() => setLang(l => l==="zh"?"en":"zh")}
          style={{ background:"transparent", border:`1px solid ${C.border2}`, borderRadius:7, padding:"4px 11px", color:C.text3, fontFamily:"inherit", fontSize:12, fontWeight:600, cursor:"pointer", flexShrink:0 }}>
          {lang==="zh"?"EN":"中文"}
        </button>

        <div style={{ display:"flex", alignItems:"center", gap:8, flexShrink:0 }}>
          {refreshing
            ? <span style={{ fontSize:11, color:C.text4 }}>{t.refreshing}</span>
            : <button onClick={() => fetchQuotes(true)} style={{ background:"none", border:`1px solid ${C.border}`, borderRadius:6, padding:"3px 9px", cursor:"pointer", fontSize:12, color:C.text4, fontFamily:"inherit" }}>↻</button>
          }
          <div style={{ display:"flex", alignItems:"center", gap:5 }}>
            <span style={{ width:6, height:6, borderRadius:"50%", background:error?C.red:C.green, display:"inline-block" }}/>
            <span style={{ fontSize:11, color:C.text4 }}>{t.simulated}</span>
          </div>
        </div>
      </header>

      {/* TICKER */}
      <div className="mobile-scroll" style={{ background:C.card, borderBottom:`1px solid ${C.border}`, display:"flex", overflowX:"auto" }}>
        {INDICES(t).map(idx => (
          <div key={idx.name} style={{ display:"flex", gap:8, alignItems:"center", padding:"8px 20px", borderRight:`1px solid ${C.border}`, flexShrink:0 }}>
            <span style={{ fontSize:11, color:C.text4, fontWeight:500 }}>{idx.name}</span>
            <span style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:"'DM Mono',monospace" }}>{idx.val}</span>
            <span style={{ fontSize:12, fontWeight:600, color:idx.pos?C.green:C.red }}>{idx.chg}</span>
          </div>
        ))}
        {lastUpd && (
          <div style={{ display:"flex", alignItems:"center", padding:"8px 16px", marginLeft:"auto", flexShrink:0 }}>
            <span style={{ fontSize:11, color:C.text4 }}>{t.lastUpdated} {lastUpd.toLocaleTimeString()}</span>
          </div>
        )}
      </div>

      <main style={{ maxWidth:1320, margin:"0 auto", padding:"16px 12px" }}>

        {/* ERROR */}
        {error && (
          <div style={{ background:C.redBg, border:`1px solid ${C.redBd}`, borderRadius:10, padding:"14px 18px", marginBottom:18, display:"flex", justifyContent:"space-between", alignItems:"center" }}>
            <div>
              <div style={{ fontSize:14, fontWeight:600, color:C.red, marginBottom:2 }}>{t.error}</div>
              <div style={{ fontSize:12, color:C.text3 }}>{t.backendTip}</div>
            </div>
            <button onClick={() => fetchQuotes()} style={{ background:C.red, border:"none", borderRadius:7, padding:"7px 16px", color:"#fff", cursor:"pointer", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>{t.retry}</button>
          </div>
        )}

        {/* MARKET */}
        {tab === "market" && (
          <div className="fu">
            <div style={{ display:"flex", gap:10, marginBottom:18, alignItems:"center", flexWrap:"wrap" }}>
              <div style={{ display:"flex", gap:3, background:C.bg2, borderRadius:9, padding:3, border:`1px solid ${C.border}` }}>
                {[["ALL",t.all],["US",t.us],["ASX",t.asx]].map(([v,l]) => (
                  <button key={v} className="seg" onClick={() => setReg(v)} style={segPill(region===v)}>{l}</button>
                ))}
              </div>
              <div style={{ display:"flex", gap:3, background:C.bg2, borderRadius:9, padding:3, border:`1px solid ${C.border}` }}>
                {[["ALL",t.all],["STOCK",t.stocks],["ETF",t.etf]].map(([v,l]) => (
                  <button key={v} className="seg" onClick={() => setTypeF(v)} style={segPill(typeF===v)}>{l}</button>
                ))}
              </div>
              <span style={{ marginLeft:"auto", fontSize:13, color:C.text4 }}>{loading ? "…" : t.results(visible.length)}</span>
            </div>

            <div style={{ ...cardBase, overflow:"hidden" }}>
              <table style={{ width:"100%", borderCollapse:"collapse" }}>
                <thead>
                  <tr style={{ borderBottom:`1px solid ${C.border}`, background:C.bg }}>
                    {[
                      {col:"symbol",label:t.colSymbol,  align:"left",  w:"90px"},
                      {col:null,    label:t.colName,     align:"left"},
                      {col:"price", label:t.colPrice,    align:"right", w:"100px"},
                      {col:"pct",   label:t.colChange,   align:"right", w:"110px"},
                      {col:null,    label:t.colTrend,    align:"center",w:"90px", mhide:true},
                      {col:"vol",   label:t.colVol,      align:"right", w:"90px", mhide:true},
                      {col:"cap",   label:t.colCap,      align:"right", w:"90px"},
                      {col:null,    label:"",             align:"center",w:"40px"},
                    ].map((h,i) => (
                      <th key={i} className={`${h.col?"th":""} ${h.mhide?"mobile-hide":""}`} onClick={h.col ? () => setSort2(h.col) : undefined}
                        style={{ padding:"10px 14px", fontSize:11, fontWeight:600, color:C.text3, textAlign:h.align, letterSpacing:"0.05em", textTransform:"uppercase", width:h.w||"auto" }}>
                        {h.label}{h.col && <Arr col={h.col}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(8).fill(0).map((_,i) => (
                        <tr key={i} style={{ borderBottom:`1px solid ${C.border}`, background:C.card }}>
                          <td style={{ padding:"13px 14px" }}><Skeleton w={48} h={13}/></td>
                          <td style={{ padding:"13px 14px" }}><Skeleton w={160} h={13}/></td>
                          <td style={{ padding:"13px 14px", textAlign:"right" }}><div style={{ display:"flex", justifyContent:"flex-end" }}><Skeleton w={70} h={13}/></div></td>
                          <td style={{ padding:"13px 14px", textAlign:"right" }}><div style={{ display:"flex", justifyContent:"flex-end" }}><Skeleton w={60} h={22} r={20}/></div></td>
                          <td style={{ padding:"13px 14px" }}><Skeleton w={72} h={28}/></td>
                          <td style={{ padding:"13px 14px", textAlign:"right" }}><div style={{ display:"flex", justifyContent:"flex-end" }}><Skeleton w={50} h={13}/></div></td>
                          <td style={{ padding:"13px 14px", textAlign:"right" }}><div style={{ display:"flex", justifyContent:"flex-end" }}><Skeleton w={55} h={13}/></div></td>
                          <td/>
                        </tr>
                      ))
                    : visible.map((s,i) => (
                        <tr key={s.symbol} className="tr" onClick={() => openModal(s)}
                          style={{ borderBottom: i < visible.length-1 ? `1px solid ${C.border}` : "none", background:C.card }}>
                          <td style={{ padding:"13px 14px" }}>
                            <div style={{ display:"flex", alignItems:"center", gap:6 }}>
                              <span style={{ fontSize:13, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace" }}>{s.symbol}</span>
                              {s.isETF && <span style={{ fontSize:10, background:C.goldBg, color:C.gold, padding:"1px 6px", borderRadius:20, fontWeight:700, border:`1px solid ${C.goldBd}`, whiteSpace:"nowrap" }}>ETF</span>}
                            </div>
                          </td>
                          <td style={{ padding:"13px 14px" }}>
                            <div style={{ fontSize:13, color:C.text2 }}>{s.name.length>34 ? s.name.slice(0,34)+"…" : s.name}</div>
                            <div style={{ fontSize:11, color:C.text4, marginTop:1 }}>{s.region==="ASX"?"🇦🇺":"🇺🇸"} {s.mkt}</div>
                          </td>
                          <td style={{ padding:"13px 14px", textAlign:"right", fontSize:14, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace", whiteSpace:"nowrap" }}>
                            {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                          </td>
                          <td style={{ padding:"13px 14px", textAlign:"right" }}>
                            <span style={chgBadge(s.pct)}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                          </td>
                          <td className="mobile-hide" style={{ padding:"13px 14px", textAlign:"center" }}>
                            <Spark symbol={s.symbol} price={s.price} pos={s.pct>=0}/>
                          </td>
                          <td className="mobile-hide" style={{ padding:"13px 14px", textAlign:"right", fontSize:12, color:C.text3, fontFamily:"'DM Mono',monospace" }}>{s.vol}</td>
                          <td style={{ padding:"13px 14px", textAlign:"right", fontSize:13, fontWeight:600, color:C.text2, fontFamily:"'DM Mono',monospace" }}>{s.cap}</td>
                          <td style={{ padding:"13px 14px", textAlign:"center" }} onClick={e => { e.stopPropagation(); toggleWatch(s.symbol); }}>
                            <span className="star" style={{ fontSize:17, color:watch.includes(s.symbol)?C.gold:C.border2 }}>
                              {watch.includes(s.symbol)?"★":"☆"}
                            </span>
                          </td>
                        </tr>
                      ))
                  }
                </tbody>
              </table>
            </div>
          </div>
        )}

        {/* WATCHLIST */}
        {tab === "watchlist" && (
          <div className="fu">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:4 }}>{t.watchTitle}</h2>
              <p style={{ fontSize:13, color:C.text3 }}>{t.watchSub}</p>
            </div>
            {watch.length === 0 ? (
              <div style={{ textAlign:"center", padding:"80px 0", color:C.text4 }}>
                <div style={{ fontSize:40, marginBottom:10 }}>☆</div>
                <p style={{ fontSize:14 }}>{t.watchEmpty}</p>
              </div>
            ) : (
              <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))", gap:12 }}>
                {allStocks.filter(s => watch.includes(s.symbol)).map(s => (
                  <div key={s.symbol} className="hcard" onClick={() => openModal(s)} style={{ ...cardBase, padding:18 }}>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:12 }}>
                      <div>
                        <div style={{ display:"flex", alignItems:"center", gap:6, marginBottom:2 }}>
                          <span style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace" }}>{s.symbol}</span>
                          {s.isETF && <span style={{ fontSize:10, background:C.goldBg, color:C.gold, padding:"1px 6px", borderRadius:20, fontWeight:700, border:`1px solid ${C.goldBd}` }}>ETF</span>}
                        </div>
                        <div style={{ fontSize:12, color:C.text3 }}>{s.mkt} · {s.sector}</div>
                      </div>
                      <div style={{ textAlign:"right" }}>
                        <div style={{ fontSize:17, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace" }}>{s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}</div>
                        <div style={{ fontSize:12, fontWeight:700, color:s.pct>=0?C.green:C.red, marginTop:2 }}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</div>
                      </div>
                    </div>
                    <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginTop:8 }}>
                      <span style={{ fontSize:11, color:C.text4 }}>{t.mktCap} {s.cap}</span>
                      <span onClick={e => { e.stopPropagation(); toggleWatch(s.symbol); }} className="star" style={{ fontSize:16, color:C.gold }}>★</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ETF */}
        {tab === "etf" && (
          <div className="fu">
            <div style={{ marginBottom:22 }}>
              <h2 style={{ fontFamily:"'Playfair Display',serif", fontSize:24, fontWeight:700, color:C.text, marginBottom:4 }}>{t.etfTitle}</h2>
              <p style={{ fontSize:13, color:C.text3 }}>{t.etfSub}</p>
            </div>
            <div style={{ display:"grid", gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))", gap:14 }}>
              {allStocks.filter(s => s.isETF).map(s => (
                <div key={s.symbol} className="hcard" onClick={() => openModal(s)} style={{ ...cardBase, padding:20 }}>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:8 }}>
                    <div>
                      <div style={{ fontSize:15, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace", marginBottom:2 }}>{s.symbol}</div>
                      <div style={{ fontSize:11, color:C.text4 }}>{s.region==="ASX"?"🇦🇺 ASX":"🇺🇸 US"}</div>
                    </div>
                    <span className="star" onClick={e => { e.stopPropagation(); toggleWatch(s.symbol); }} style={{ fontSize:18, color:watch.includes(s.symbol)?C.gold:C.border2 }}>
                      {watch.includes(s.symbol)?"★":"☆"}
                    </span>
                  </div>
                  <p style={{ fontSize:12, color:C.text3, marginBottom:12, lineHeight:1.5 }}>{s.name}</p>
                  <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-end" }}>
                    <div>
                      <div style={{ fontSize:18, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace" }}>{s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}</div>
                      <div style={{ fontSize:12, fontWeight:700, color:s.pct>=0?C.green:C.red, marginTop:2 }}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</div>
                    </div>
                    <div style={{ textAlign:"right" }}>
                      <div style={{ fontSize:11, color:C.text4 }}>{t.scale}</div>
                      <div style={{ fontSize:13, fontWeight:600, color:C.text2, fontFamily:"'DM Mono'", marginTop:1 }}>{s.cap}</div>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}
      </main>

      {/* STOCK DETAIL MODAL */}
      {modal && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.25)", zIndex:200, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }}
          onClick={() => setModal(null)}>
          <div className="fu" style={{ ...cardBase, width:"100%", maxWidth:580, maxHeight:"95vh", overflowY:"auto", boxShadow:"0 20px 60px rgba(0,0,0,0.15)", margin:"0 4px" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ padding:"22px 22px 0" }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"flex-start", marginBottom:18 }}>
                <div>
                  <div style={{ display:"flex", alignItems:"center", gap:8, marginBottom:3 }}>
                    <span style={{ fontSize:20, fontWeight:700, color:C.text, fontFamily:"'DM Mono',monospace" }}>{modal.symbol}</span>
                    {modal.isETF && <span style={{ fontSize:11, background:C.goldBg, color:C.gold, padding:"2px 8px", borderRadius:20, fontWeight:700, border:`1px solid ${C.goldBd}` }}>ETF</span>}
                    <span style={{ fontSize:11, color:C.text4, background:C.bg2, padding:"2px 8px", borderRadius:20 }}>{modal.region==="ASX"?"🇦🇺 ASX":"🇺🇸 US"}</span>
                  </div>
                  <div style={{ fontSize:13, color:C.text3 }}>{modal.name}</div>
                </div>
                <button onClick={() => setModal(null)} style={{ background:C.bg2, border:`1px solid ${C.border}`, borderRadius:7, width:32, height:32, cursor:"pointer", fontSize:18, color:C.text3, display:"flex", alignItems:"center", justifyContent:"center" }}>×</button>
              </div>

              <div style={{ display:"flex", alignItems:"baseline", gap:12, marginBottom:14, flexWrap:"wrap" }}>
                <span style={{ fontFamily:"'Playfair Display',serif", fontSize:38, fontWeight:700, color:C.text }}>
                  {modal.region==="ASX"?"A$":"$"}{modal.price?.toFixed(2)}
                </span>
                <span style={chgBadge(modal.pct)}>{modal.pct>=0?"▲":"▼"} {Math.abs(modal.pct).toFixed(2)}%</span>
                <span style={{ fontSize:13, color:modal.pct>=0?C.green:C.red, opacity:0.8 }}>
                  {modal.change>=0?"+":""}{modal.change?.toFixed(2)}
                </span>
              </div>

              <div style={{ display:"flex", gap:4, marginBottom:8 }}>
                {["1wk","1mo","3mo","6mo","1y","2y"].map(p => (
                  <button key={p} className="period-btn" onClick={() => setHP(p)}
                    style={{ padding:"3px 10px", borderRadius:6, fontSize:12, background:histPeriod===p?C.bg2:"transparent", color:histPeriod===p?C.text:C.text3, fontWeight:histPeriod===p?600:400, border:`1px solid ${histPeriod===p?C.border2:C.border}` }}>
                    {p}
                  </button>
                ))}
              </div>

              <div style={{ borderRadius:10, overflow:"hidden", background:modal.pct>=0?C.greenBg:C.redBg, padding:"8px 10px", marginBottom:18, border:`1px solid ${modal.pct>=0?C.greenBd:C.redBd}` }}>
                {history.length > 0
                  ? <AreaChart closes={history} pos={modal.pct>=0} h={110}/>
                  : <div style={{ height:110, display:"flex", alignItems:"center", justifyContent:"center" }}>
                      <div style={{ width:18, height:18, border:`2px solid ${C.border2}`, borderTopColor:C.text, borderRadius:"50%", animation:"spin 0.7s linear infinite" }}/>
                    </div>
                }
              </div>

              <div style={{ display:"grid", gridTemplateColumns:"1fr 1fr 1fr", gap:8, marginBottom:18 }}>
                {[
                  [t.mktCap, modal.cap], [t.vol, modal.vol], [t.pe, modal.pe??t.na],
                  [t.exchange, modal.mkt], [t.sector, modal.sector], [t.type, modal.isETF?t.etfType:t.stockType],
                ].map(([k,v]) => (
                  <div key={k} style={{ background:C.bg, borderRadius:8, padding:"10px 12px", border:`1px solid ${C.border}` }}>
                    <div style={{ fontSize:10, color:C.text4, marginBottom:3, fontWeight:600, letterSpacing:"0.05em", textTransform:"uppercase" }}>{k}</div>
                    <div style={{ fontSize:13, fontWeight:600, color:C.text, fontFamily:"'DM Mono',monospace" }}>{v}</div>
                  </div>
                ))}
              </div>
            </div>

            <div style={{ borderTop:`1px solid ${C.border}`, padding:22 }}>
              <div style={{ display:"flex", justifyContent:"space-between", alignItems:"center", marginBottom:12 }}>
                <div style={{ display:"flex", alignItems:"center", gap:8 }}>
                  <div style={{ width:24, height:24, background:C.accent, borderRadius:6, display:"flex", alignItems:"center", justifyContent:"center", fontSize:12, color:"#fff" }}>✦</div>
                  <span style={{ fontSize:14, fontWeight:600, color:C.text }}>{t.aiTitle}</span>
                  <span style={{ fontSize:11, background:C.bg2, color:C.text3, padding:"2px 8px", borderRadius:20, fontWeight:500 }}>Claude</span>
                </div>
                {!aiText && !aiLoad && (
                  <button className="ai-btn" onClick={() => runAI(modal)}
                    style={{ background:C.accent, borderRadius:8, padding:"7px 16px", color:"#fff", fontFamily:"inherit", fontSize:13, fontWeight:600 }}>
                    {t.aiGenerate}
                  </button>
                )}
              </div>
              {aiLoad && (
                <div style={{ display:"flex", alignItems:"center", gap:9, color:C.text3, padding:"8px 0" }}>
                  <div style={{ width:16, height:16, border:`2px solid ${C.border2}`, borderTopColor:C.text, borderRadius:"50%", animation:"spin 0.7s linear infinite", flexShrink:0 }}/>
                  <span style={{ fontSize:13 }}>{aiMsg}</span>
                </div>
              )}
              {!aiLoad && !aiText && <p style={{ fontSize:13, color:C.text4, lineHeight:1.7 }}>{t.aiHint}</p>}
              {aiText && (
                <div style={{ background:C.bg, borderRadius:8, padding:"12px 14px", border:`1px solid ${C.border}` }}>
                  <p style={{ fontSize:13, color:C.text2, lineHeight:1.85, whiteSpace:"pre-wrap" }}>{aiText}</p>
                </div>
              )}
            </div>

            <div style={{ padding:"0 22px 22px", display:"flex", gap:8 }}>
              <button onClick={() => toggleWatch(modal.symbol)}
                style={{ flex:1, background:watch.includes(modal.symbol)?C.goldBg:"transparent", border:`1px solid ${watch.includes(modal.symbol)?C.goldBd:C.border}`, borderRadius:8, padding:"9px", color:watch.includes(modal.symbol)?C.gold:C.text3, fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer" }}>
                {watch.includes(modal.symbol)?t.inWatch:t.addWatch}
              </button>
              {aiText && (
                <button onClick={() => runAI(modal)}
                  style={{ flex:1, background:"transparent", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px", color:C.text3, fontFamily:"inherit", fontSize:13, fontWeight:500, cursor:"pointer" }}>
                  {t.aiRetry}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

      {/* MOBILE BOTTOM NAV */}
      <nav style={{ display:"none", position:"fixed", bottom:0, left:0, right:0, background:C.card, borderTop:`1px solid ${C.border}`, padding:"8px 0", zIndex:40, justifyContent:"space-around" }}
        className="mobile-bottom-nav">
        {[["market",t.tabMarket,"📊"],["watchlist",t.tabWatch,"⭐"],["etf",t.tabEtf,"📈"]].map(([id,lbl,icon])=>(
          <button key={id} onClick={()=>setTab(id)}
            style={{ background:"none", border:"none", display:"flex", flexDirection:"column", alignItems:"center", gap:2, cursor:"pointer", padding:"4px 16px", color:tab===id?C.accent:C.text4, fontFamily:"inherit" }}>
            <span style={{ fontSize:20 }}>{icon}</span>
            <span style={{ fontSize:10, fontWeight:tab===id?600:400 }}>{lbl}</span>
          </button>
        ))}
      </nav>

      {/* API KEY MODAL */}
      {showKey && (
        <div style={{ position:"fixed", inset:0, background:"rgba(0,0,0,0.35)", zIndex:300, display:"flex", alignItems:"center", justifyContent:"center", padding:20, backdropFilter:"blur(4px)" }}
          onClick={() => setShowKey(false)}>
          <div style={{ background:C.card, borderRadius:12, padding:28, width:"100%", maxWidth:400, boxShadow:"0 20px 60px rgba(0,0,0,0.15)" }}
            onClick={e => e.stopPropagation()}>
            <div style={{ fontSize:16, fontWeight:700, color:C.text, marginBottom:6 }}>{t.aiKeyTitle}</div>
            <div style={{ fontSize:13, color:C.text3, marginBottom:16, lineHeight:1.6 }}>
              {t.aiKeyDesc}
            </div>
            <input
              type="password"
              placeholder={t.aiKeyPlaceholder}
              defaultValue={apiKey}
              id="apiKeyInput"
              style={{ width:"100%", border:`1px solid ${C.border}`, borderRadius:8, padding:"9px 12px", fontSize:13, fontFamily:"inherit", marginBottom:12, color:C.text }}
              autoFocus
            />
            <div style={{ display:"flex", gap:8 }}>
              <button onClick={() => setShowKey(false)}
                style={{ flex:1, background:C.bg2, border:"none", borderRadius:8, padding:"9px", fontFamily:"inherit", fontSize:13, cursor:"pointer", color:C.text3 }}>
                {t.aiKeyCancel}
              </button>
              <button onClick={() => {
                const key = document.getElementById("apiKeyInput").value;
                if (key) confirmKey(key);
              }}
                style={{ flex:1, background:C.accent, border:"none", borderRadius:8, padding:"9px", fontFamily:"inherit", fontSize:13, fontWeight:600, cursor:"pointer", color:"#fff" }}>
                {t.aiKeyConfirm}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
