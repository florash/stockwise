import { useState, useEffect, useCallback, useRef } from "react";

const API = "https://stockwise-76dt.onrender.com";

const C = {
  bg:"#f8f9fb", bg2:"#f1f3f5", card:"#ffffff", border:"#e8eaed",
  border2:"#d1d5db", accent:"#1a1a2e", accentL:"#16213e",
  goldBg:"#f3f4f6", goldL:"#e5e7eb",
  text:"#111827", text2:"#374151", text3:"#9ca3af",
  green:"#059669", greenBg:"#ecfdf5", red:"#dc2626", redBg:"#fef2f2",
  gold:"#f59e0b",
};

const DEFAULT_SYMBOLS = [
  // 美股核心
  "AAPL","NVDA","MSFT","TSLA","AMZN","META","GOOGL","SPY","QQQ","GLD",
  // 澳股核心
  "BHP","CBA","CSL","RIO","NAB","WBC","ANZ","WES","MQG","TLS",
  "FMG","WOW","XRO","GMG","RMD",
  // 热门ETF
  "VAS","NDQ","A200","VGS","VDHG",
];

const T = {
  zh:{
    brand:"Stockwise",
    searchPh:"搜索股票代码，如 AAPL、BHP…",
    simulated:"延迟行情", tabMarket:"市场", tabWatch:"自选股", tabEtf:"ETF", tabPortfolio:"持仓", tabNews:"新闻",
    all:"全部", us:"🇺🇸 美股", asx:"🇦🇺 澳股", stocks:"个股", etf:"ETF",
    results:(n)=>`${n} 条结果`,
    colSymbol:"代码 / 名称", colPrice:"价格", colChange:"涨跌幅",
    colTrend:"走势", colVol:"成交量", colCap:"市值",
    watchTitle:"自选股", watchSub:"点击 ★ 添加或移除",
    watchEmpty:"暂无自选股", etfTitle:"ETF 筛选器", etfSub:"美股 & 澳股主流 ETF",
    scale:"规模", mktCap:"市值", vol:"成交量", pe:"市盈率",
    exchange:"交易所", sector:"板块", type:"类型",
    etfType:"ETF", stockType:"个股",
    aiTitle:"AI 智能分析", aiGenerate:"生成分析 →",
    aiHint:"点击「生成分析」，Claude AI 将从近期表现、投资逻辑、风险三个维度进行专业分析。",
    aiAnalyzing:["分析财务数据中…","获取市场情绪…","生成分析报告…"],
    aiRetry:"↻ 重新分析", addWatch:"☆ 加入自选", inWatch:"★ 已加自选",
    na:"N/A", loading:"加载中…", error:"数据加载失败",
    retry:"重试", backendTip:"请确认后端已启动",
    refreshing:"更新中…", lastUpdated:"更新",
    preMarket:"盘前", postMarket:"盘后", intraday:"分时",
    pfTitle:"我的持仓", pfSub:"数据保存在本地，刷新不丢失",
    pfEmpty:"还没有持仓，点击「+ 添加持仓」开始",
    pfAdd:"+ 添加持仓", pfEdit:"编辑", pfDelete:"删除",
    pfTotalValue:"总市值", pfTotalCost:"总成本", pfTotalPnl:"总盈亏", pfTotalPct:"总收益率",
    pfSymbol:"股票代码", pfQty:"数量（股）", pfAvgCost:"买入均价",
    pfCancel:"取消", pfSave:"保存",
    pfCost:"成本", pfNow:"现价", pfPnl:"盈亏", pfWeight:"仓位",
    pfNoPrice:"价格加载中…",
    newsTitle:"财经新闻", newsSub:"实时市场资讯",
    newsAll:"全部", newsUS:"🇺🇸 美股", newsASX:"🇦🇺 澳股",
    newsLoading:"加载新闻中…", newsEmpty:"暂无新闻",
    aiPrompt:(s)=>`你是一位专业的证券分析师。请用简洁的中文（约200字）分析：\n股票：${s.name}（${s.symbol}）| 市场：${s.mkt} | 板块：${s.sector}\n价格：${s.price} | 涨跌：${s.pct}% | 市值：${s.cap}${s.pe?` | P/E：${s.pe}`:"（ETF）"}\n\n请简明分析：1）近期表现 2）核心投资逻辑 3）主要风险。专业客观。`,
  },
  en:{
    brand:"Stockwise",
    searchPh:"Search stocks / ETFs, e.g. AAPL, BHP…",
    simulated:"Delayed", tabMarket:"Market", tabWatch:"Watchlist", tabEtf:"ETFs", tabPortfolio:"Portfolio", tabNews:"News",
    all:"All", us:"🇺🇸 US", asx:"🇦🇺 ASX", stocks:"Stocks", etf:"ETF",
    results:(n)=>`${n} results`,
    colSymbol:"Symbol / Name", colPrice:"Price", colChange:"Change",
    colTrend:"Trend", colVol:"Volume", colCap:"Mkt Cap",
    watchTitle:"Watchlist", watchSub:"Click ★ to add or remove",
    watchEmpty:"No stocks in watchlist", etfTitle:"ETF Explorer", etfSub:"Top US & ASX ETFs",
    scale:"AUM", mktCap:"Mkt Cap", vol:"Volume", pe:"P/E",
    exchange:"Exchange", sector:"Sector", type:"Type",
    etfType:"ETF", stockType:"Stock",
    aiTitle:"AI Analysis", aiGenerate:"Analyse →",
    aiHint:"Click 'Analyse' — Claude AI will assess performance, investment thesis, and key risks.",
    aiAnalyzing:["Analysing financials…","Reading sentiment…","Generating report…"],
    aiRetry:"↻ Re-analyse", addWatch:"☆ Watchlist", inWatch:"★ Watching",
    na:"N/A", loading:"Loading…", error:"Failed to load",
    retry:"Retry", backendTip:"Make sure backend is running",
    refreshing:"Refreshing…", lastUpdated:"Updated",
    preMarket:"Pre", postMarket:"Post", intraday:"Today",
    pfTitle:"My Portfolio", pfSub:"Saved locally in your browser",
    pfEmpty:"No holdings yet. Click '+ Add Position' to get started.",
    pfAdd:"+ Add Position", pfEdit:"Edit", pfDelete:"Remove",
    pfTotalValue:"Total Value", pfTotalCost:"Total Cost", pfTotalPnl:"Total P&L", pfTotalPct:"Return",
    pfSymbol:"Ticker Symbol", pfQty:"Shares", pfAvgCost:"Avg Cost Price",
    pfCancel:"Cancel", pfSave:"Save",
    pfCost:"Cost", pfNow:"Price", pfPnl:"P&L", pfWeight:"Weight",
    pfNoPrice:"Loading price…",
    newsTitle:"Market News", newsSub:"Live financial headlines",
    newsAll:"All", newsUS:"🇺🇸 US", newsASX:"🇦🇺 ASX",
    newsLoading:"Loading news…", newsEmpty:"No news available",
    aiPrompt:(s)=>`You are a professional securities analyst. Provide a concise analysis (~150 words) of:\nStock: ${s.name} (${s.symbol}) | Market: ${s.mkt} | Sector: ${s.sector}\nPrice: ${s.price} | Change: ${s.pct}% | Mkt Cap: ${s.cap}${s.pe?` | P/E: ${s.pe}`:" (ETF)"}\n\nCover: 1) Recent performance 2) Core investment thesis 3) Key risks. Professional and objective.`,
  },
};

function Logo(){
  return(
    <svg width="32" height="32" viewBox="0 0 32 32" fill="none">
      <rect width="32" height="32" rx="8" fill="#1a1a2e"/>
      <polyline points="4,22 10,16 15,19 22,10 28,13" fill="none" stroke="white" strokeWidth="2.2" strokeLinejoin="round" strokeLinecap="round"/>
      <circle cx="28" cy="13" r="2.5" fill="#f59e0b"/>
    </svg>
  );
}

function Spark({data,pos,w=72,h=28}){
  if(!data||data.length<2) return <svg width={w} height={h}/>;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(" ");
  return(
    <svg width={w} height={h} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={pos?C.green:C.red} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

function AreaChart({closes,pos,h=110}){
  if(!closes||closes.length<2) return(
    <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:13}}>暂无数据</div>
  );
  const data=closes.map(d=>d.close);
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const W=560;
  const pts=data.map((v,i)=>[(i/(data.length-1))*W,h-((v-mn)/rng)*(h-12)-6]);
  const line=pts.map(p=>p.join(",")).join(" ");
  const area=`0,${h} ${line} ${W},${h}`;
  const c=pos?C.green:C.red;
  const id=`ag-${Math.random().toString(36).slice(2)}`;
  return(
    <svg width="100%" viewBox={`0 0 ${W} ${h}`} preserveAspectRatio="none" style={{display:"block"}}>
      <defs>
        <linearGradient id={id} x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stopColor={c} stopOpacity="0.18"/>
          <stop offset="100%" stopColor={c} stopOpacity="0.01"/>
        </linearGradient>
      </defs>
      <polygon points={area} fill={`url(#${id})`}/>
      <polyline points={line} fill="none" stroke={c} strokeWidth="2" strokeLinejoin="round"/>
    </svg>
  );
}

function Skeleton({w="100%",h=16,radius=4}){
  return(
    <div style={{width:w,height:h,borderRadius:radius,background:`linear-gradient(90deg,${C.border} 25%,${C.goldBg} 50%,${C.border} 75%)`,backgroundSize:"200% 100%",animation:"shimmer 1.4s infinite"}}/>
  );
}

// ── Mini donut chart for portfolio ──
function DonutChart({slices, size=120}){
  const total = slices.reduce((s,x)=>s+x.value,0);
  if(!total) return null;
  let cum = 0;
  const r = 40, cx = size/2, cy = size/2, stroke = 14;
  const paths = slices.map((sl,i)=>{
    const pct = sl.value/total;
    const start = cum * 2 * Math.PI - Math.PI/2;
    cum += pct;
    const end = cum * 2 * Math.PI - Math.PI/2;
    const x1=cx+r*Math.cos(start), y1=cy+r*Math.sin(start);
    const x2=cx+r*Math.cos(end),   y2=cy+r*Math.sin(end);
    const large = pct>0.5?1:0;
    return <path key={i} d={`M ${x1} ${y1} A ${r} ${r} 0 ${large} 1 ${x2} ${y2}`}
      fill="none" stroke={sl.color} strokeWidth={stroke} strokeLinecap="butt"/>;
  });
  return(
    <svg width={size} height={size}>
      <circle cx={cx} cy={cy} r={r} fill="none" stroke={C.border} strokeWidth={stroke}/>
      {paths}
    </svg>
  );
}

const PORTFOLIO_COLORS = ["#1a1a2e","#f59e0b","#059669","#dc2626","#6366f1","#0ea5e9","#8b5cf6","#ec4899","#14b8a6","#f97316"];

export default function App(){
  const [lang,setLang]    = useState("zh");
  const [tab,setTab]      = useState("market");
  const [region,setReg]   = useState("ALL");
  const [typeF,setTypeF]  = useState("ALL");
  const [query,setQuery]  = useState("");
  const [sort,setSort]    = useState({col:"cap",dir:-1});
  const [watch,setWatch]  = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("sw_watch")||'["AAPL","BHP","SPY","VAS","NVDA"]'); }catch{ return ["AAPL","BHP","SPY","VAS","NVDA"]; }
  });
  const [modal,setModal]  = useState(null);
  const [history,setHist] = useState([]);
  const [histPeriod,setHP]= useState("1mo");
  const [aiText,setAiT]   = useState("");
  const [aiLoad,setAiL]   = useState(false);
  const [aiMsg,setAiMsg]  = useState("");
  const [indices,setIndices] = useState([]);
  const searchTimer = useRef(null);
  const [stocks,setStocks]   = useState([]);
  const [loading,setLoad]    = useState(true);
  const [error,setError]     = useState(null);
  const [lastUpd,setLastU]   = useState(null);
  const [refreshing,setRef]  = useState(false);

  // ── Portfolio state ──
  const [portfolio,setPortfolio] = useState(()=>{
    try{ return JSON.parse(localStorage.getItem("sw_portfolio")||"[]"); }catch{ return []; }
  });
  const [pfModal,setPfModal] = useState(false);   // add/edit modal open
  const [pfEditing,setPfEditing] = useState(null); // null = new, else index
  const [pfForm,setPfForm]   = useState({symbol:"",qty:"",cost:""});
  const [pfError,setPfError] = useState("");
  const [pfSearch,setPfSearch] = useState([]);
  const [pfSearching,setPfSearching] = useState(false);

  const [news,setNews]      = useState([]);
  const [newsLoad,setNLoad] = useState(false);
  const [newsReg,setNReg]   = useState("ALL");
  const pfSearchTimer = useRef(null);

  const t = T[lang];

  // persist watch + portfolio
  useEffect(()=>{ localStorage.setItem("sw_watch", JSON.stringify(watch)); },[watch]);
  useEffect(()=>{ localStorage.setItem("sw_portfolio", JSON.stringify(portfolio)); },[portfolio]);

  const fetchQuotes = useCallback(async(isRefresh=false)=>{
    if(isRefresh) setRef(true); else setLoad(true);
    setError(null);
    try{
      const res = await fetch(`${API}/quotes?symbols=${DEFAULT_SYMBOLS.join(",")}`);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      setStocks(json.data.filter(s=>s.price!=null&&!s.error));
      setLastU(new Date());
    }catch(e){ setError(e.message); }
    finally{ setLoad(false); setRef(false); }
  },[]);

  useEffect(()=>{ fetchQuotes(); },[fetchQuotes]);
  useEffect(()=>{
    fetch(`${API}/indices`).then(r=>r.json()).then(j=>setIndices(j.data||[])).catch(()=>{});
  },[]);
  useEffect(()=>{
    const iv=setInterval(()=>fetchQuotes(true),60000);
    return ()=>clearInterval(iv);
  },[fetchQuotes]);
  useEffect(()=>{
    if(!modal) return;
    setHist([]);
    const sym=modal.yahooSym||modal.symbol;
    if(histPeriod==="today"){
      fetch(`${API}/intraday?symbol=${sym}`)
        .then(r=>r.json())
        .then(j=>setHist((j.data||[]).map(d=>({date:d.time,close:d.close}))))
        .catch(()=>setHist([]));
    } else {
      fetch(`${API}/history?symbol=${sym}&period=${histPeriod}`)
        .then(r=>r.json())
        .then(j=>setHist(j.data||[]))
        .catch(()=>setHist([]));
    }
  },[modal,histPeriod]);

  // ── Portfolio: fetch price for a symbol not in stocks ──
  const getPrice = sym => stocks.find(s=>s.symbol===sym.toUpperCase());

  // ── Portfolio computed values ──
  const pfRows = portfolio.map((h,i)=>{
    const stock = getPrice(h.symbol);
    const nowPrice = stock?.price ?? null;
    const currency = stock?.region==="ASX"?"A$":"$";
    const costTotal = h.qty * h.cost;
    const nowTotal  = nowPrice!=null ? h.qty * nowPrice : null;
    const pnl       = nowTotal!=null ? nowTotal - costTotal : null;
    const pnlPct    = pnl!=null ? (pnl/costTotal)*100 : null;
    return { ...h, i, stock, nowPrice, currency, costTotal, nowTotal, pnl, pnlPct };
  });
  const pfTotalCost  = pfRows.reduce((s,r)=>s+r.costTotal,0);
  const pfTotalValue = pfRows.reduce((s,r)=>s+(r.nowTotal??r.costTotal),0);
  const pfTotalPnl   = pfTotalValue - pfTotalCost;
  const pfTotalPct   = pfTotalCost>0 ? (pfTotalPnl/pfTotalCost)*100 : 0;

  const donutSlices = pfRows.map((r,i)=>({
    value: r.nowTotal??r.costTotal,
    color: PORTFOLIO_COLORS[i % PORTFOLIO_COLORS.length],
  }));

  // ── Portfolio CRUD ──
  const openAddPf = ()=>{ setPfEditing(null); setPfForm({symbol:"",qty:"",cost:""}); setPfError(""); setPfSearch([]); setPfModal(true); };
  const openEditPf = (idx)=>{ const h=portfolio[idx]; setPfEditing(idx); setPfForm({symbol:h.symbol,qty:String(h.qty),cost:String(h.cost)}); setPfError(""); setPfSearch([]); setPfModal(true); };
  const savePf = async()=>{
    const sym  = pfForm.symbol.trim().toUpperCase();
    const qty  = parseFloat(pfForm.qty);
    const cost = parseFloat(pfForm.cost);
    if(!sym)             { setPfError(lang==="zh"?"请输入股票代码":"Enter a symbol"); return; }
    if(!qty||qty<=0)     { setPfError(lang==="zh"?"数量必须大于 0":"Qty must be > 0"); return; }
    if(!cost||cost<=0)   { setPfError(lang==="zh"?"均价必须大于 0":"Cost must be > 0"); return; }
    // check if symbol exists in stocks; if not, try fetching
    let exists = stocks.find(s=>s.symbol===sym);
    if(!exists){
      setPfSearching(true);
      try{
        const r = await fetch(`${API}/search?q=${sym}`);
        const j = await r.json();
        if(j.results?.length){ exists=j.results[0]; }
      }catch{}
      setPfSearching(false);
    }
    if(!exists){ setPfError(lang==="zh"?`找不到 ${sym}，请检查代码`:`Can't find ${sym}`); return; }
    const entry = {symbol:sym, qty, cost};
    if(pfEditing!=null){
      setPortfolio(p=>p.map((x,i)=>i===pfEditing?entry:x));
    } else {
      // avoid duplicate
      if(portfolio.find(x=>x.symbol===sym)){ setPfError(lang==="zh"?`${sym} 已在持仓中`:`${sym} already in portfolio`); return; }
      setPortfolio(p=>[...p,entry]);
    }
    setPfModal(false);
  };
  const deletePf = idx=>setPortfolio(p=>p.filter((_,i)=>i!==idx));

  const fmt = (v,dec=2)=>v==null?"—":(v>=0?"+":"")+v.toFixed(dec);
  const fmtAbs = (v,dec=2)=>v==null?"—":Math.abs(v).toFixed(dec);

  const pn = v=>parseFloat(String(v).replace(/[^0-9.]/g,""));
  const visible = stocks.filter(s=>{
    const mr=region==="ALL"||s.region===region;
    const mt=typeF==="ALL"||(typeF==="ETF"&&s.isETF)||(typeF==="STOCK"&&!s.isETF);
    const mq=!query||s.symbol.toLowerCase().includes(query.toLowerCase())||s.name.toLowerCase().includes(query.toLowerCase());
    return mr&&mt&&mq;
  }).sort((a,b)=>{
    if(sort.col==="symbol") return sort.dir*(a.symbol<b.symbol?-1:1);
    if(sort.col==="pct")    return sort.dir*(a.pct-b.pct);
    if(sort.col==="price")  return sort.dir*(a.price-b.price);
    if(sort.col==="vol")    return sort.dir*(pn(a.vol)-pn(b.vol));
    if(sort.col==="cap")    return sort.dir*(pn(a.cap)-pn(b.cap));
    return 0;
  });

  const setSort2 = col=>setSort(p=>p.col===col?{...p,dir:-p.dir}:{col,dir:-1});
  const Arr=({col})=>sort.col!==col?<span style={{opacity:0.3,marginLeft:3}}>↕</span>:<span style={{marginLeft:3}}>{sort.dir===-1?"↓":"↑"}</span>;
  const toggleWatch = sym=>setWatch(p=>p.includes(sym)?p.filter(s=>s!==sym):[...p,sym]);
  const openModal   = s=>{ setModal(s); setAiT(""); setHP("1mo"); };

  const runAI = async stock=>{
    setAiT(""); setAiL(true);
    const msgs=t.aiAnalyzing; let i=0; setAiMsg(msgs[0]);
    const iv=setInterval(()=>{ i=(i+1)%msgs.length; setAiMsg(msgs[i]); },1100);
    try{
      const r=await fetch("https://api.anthropic.com/v1/messages",{
        method:"POST",headers:{"Content-Type":"application/json"},
        body:JSON.stringify({model:"claude-sonnet-4-20250514",max_tokens:1000,
          messages:[{role:"user",content:t.aiPrompt(stock)}]})
      });
      const d=await r.json();
      setAiT(d.content?.map(b=>b.text||"").join("")||t.na);
    }catch{ setAiT(lang==="zh"?"AI 分析暂时不可用":"AI analysis unavailable."); }
    finally{ clearInterval(iv); setAiL(false); }
  };

  const isMarket=tab==="market"||!!query;
  const cardBase={background:C.card,border:`1px solid ${C.border}`,borderRadius:12,boxShadow:"0 1px 3px rgba(0,0,0,0.06)"};
  const chgPill=pct=>({display:"inline-flex",alignItems:"center",gap:3,background:pct>=0?C.greenBg:C.redBg,color:pct>=0?C.green:C.red,padding:"3px 9px",borderRadius:20,fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"});
  const SparkData=s=>{ const base=s.price||100,n=20,d=[]; let p=base*0.97; for(let i=0;i<n;i++){p+=((Math.random()-0.48)*base*0.003);d.push(p);} d[n-1]=s.price||base; return d; };

  const css=`
@import url('https://fonts.googleapis.com/css2?family=Inter:wght@300;400;500;600;700&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg};-webkit-font-smoothing:antialiased}
::-webkit-scrollbar{width:4px;height:4px}
::-webkit-scrollbar-track{background:transparent}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
input::placeholder{color:${C.text3}}
input:focus{outline:none;border-color:${C.accent}!important;box-shadow:0 0 0 3px rgba(26,26,46,0.08)}
.tr{transition:background 0.1s;cursor:pointer}
.tr:hover{background:${C.bg}!important}
.tab-btn{transition:all 0.14s;cursor:pointer;border:none;background:none;font-family:inherit}
.tab-btn:hover{color:${C.text}!important}
.seg{transition:all 0.12s;cursor:pointer;border:none;font-family:inherit;user-select:none}
.card{transition:all 0.18s;cursor:pointer}
.card:hover{box-shadow:0 6px 24px rgba(0,0,0,0.1)!important;transform:translateY(-1px)}
.star{cursor:pointer;transition:transform 0.15s;user-select:none;display:inline-block}
.star:hover{transform:scale(1.25)}
.th{cursor:pointer;user-select:none;white-space:nowrap}
.th:hover{color:${C.text}!important}
.ai-btn{transition:all 0.15s;cursor:pointer;border:none}
.ai-btn:hover{opacity:0.85}
.period-btn{transition:all 0.12s;cursor:pointer;border:none;font-family:inherit}
.period-btn:hover{background:${C.goldBg}!important}
.pf-row:hover{background:${C.bg}!important}
.pf-action{opacity:0;transition:opacity 0.15s}
.news-card:hover{box-shadow:0 6px 24px rgba(0,0,0,0.1)!important;transform:translateY(-1px)}
.pf-row:hover .pf-action{opacity:1}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fu{from{opacity:0;transform:translateY(6px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu 0.24s ease forwards}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
@media(max-width:768px){
  .hide-mobile{display:none!important}
  .mobile-full{width:100%!important;max-width:100%!important}
  .ticker-bar{overflow-x:auto;-webkit-overflow-scrolling:touch}
  .modal-inner{padding:18px!important;margin:0!important;border-radius:16px 16px 0 0!important;position:fixed!important;bottom:0!important;top:auto!important;max-height:92vh!important}
  .modal-wrap{align-items:flex-end!important}
  .stat-grid{grid-template-columns:repeat(2,1fr)!important}
  .header-nav{display:none!important}
  .mobile-nav{display:flex!important}
  .pf-action{opacity:1!important}
}
@media(min-width:769px){.mobile-nav{display:none!important}}
`;

  return(
    <div style={{fontFamily:"'Inter',sans-serif",color:C.text,minHeight:"100vh",background:C.bg}}>
      <style>{css}</style>

      {/* HEADER */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1280,margin:"0 auto",padding:"0 20px"}}>
          <div style={{display:"flex",alignItems:"center",gap:16,height:54}}>
            <div style={{display:"flex",alignItems:"center",gap:9,flexShrink:0}}>
              <Logo/>
              <span style={{fontWeight:700,fontSize:17,color:C.text,letterSpacing:"-0.3px"}}>{t.brand}</span>
            </div>
            <div style={{flex:1,maxWidth:420}}>
              <input
                placeholder={t.searchPh}
                onChange={e=>{ const v=e.target.value; clearTimeout(searchTimer.current); searchTimer.current=setTimeout(()=>setQuery(v),350); }}
                style={{width:"100%",height:34,borderRadius:8,border:`1px solid ${C.border}`,background:C.bg,padding:"0 12px",fontSize:13,color:C.text,fontFamily:"inherit"}}
              />
            </div>
            <nav className="header-nav" style={{display:"flex",gap:2,marginLeft:8}}>
             {[["market",t.tabMarket],["watchlist",t.tabWatch],["etf",t.tabEtf],["portfolio",t.tabPortfolio],["news",t.tabNews]].map(([v,l])=>(
                <button key={v} className="tab-btn" onClick={()=>{setTab(v);setQuery("");}}
                  style={{padding:"6px 14px",fontSize:13,fontWeight:tab===v?600:400,color:tab===v?C.text:C.text3,borderBottom:tab===v?`2px solid ${C.accent}`:"2px solid transparent"}}>
                  {l}
                </button>
              ))}
            </nav>
            <div style={{marginLeft:"auto",display:"flex",gap:8,alignItems:"center"}}>
              {refreshing&&<span style={{fontSize:11,color:C.text3}}>{t.refreshing}</span>}
              <button onClick={()=>setLang(l=>l==="zh"?"en":"zh")}
                style={{padding:"4px 10px",borderRadius:6,border:`1px solid ${C.border}`,background:"transparent",fontSize:12,color:C.text3,cursor:"pointer",fontFamily:"inherit"}}>
                {lang==="zh"?"EN":"中"}
              </button>
            </div>
          </div>
        </div>
        <div className="mobile-nav" style={{borderTop:`1px solid ${C.border}`,justifyContent:"space-around"}}>
        {[["market",t.tabMarket],["watchlist",t.tabWatch],["etf",t.tabEtf],["portfolio",t.tabPortfolio],["news",t.tabNews]].map(([v,l])=>(
            <button key={v} className="tab-btn" onClick={()=>{setTab(v);setQuery("");}}
              style={{flex:1,padding:"10px 0",fontSize:12,fontWeight:tab===v?600:400,color:tab===v?C.accent:C.text3,borderBottom:tab===v?`2px solid ${C.accent}`:"2px solid transparent",textAlign:"center"}}>
              {l}
            </button>
          ))}
        </div>
      </div>

      {/* TICKER BAR */}
      <div className="ticker-bar" style={{background:C.card,borderBottom:`1px solid ${C.border}`}}>
        <div style={{display:"flex",overflowX:"auto",padding:"0 20px",scrollbarWidth:"none"}}>
          {indices.length>0
            ? indices.map((idx,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:6,padding:"7px 16px",borderRight:`1px solid ${C.border}`,flexShrink:0}}>
                <span style={{fontSize:11,color:C.text3,fontWeight:500,whiteSpace:"nowrap"}}>{idx.name}</span>
                <span style={{fontSize:12,fontWeight:700,fontFamily:"'DM Mono',monospace",whiteSpace:"nowrap"}}>{idx.val}</span>
                <span style={{fontSize:11,fontWeight:600,color:idx.pos?C.green:C.red,fontFamily:"'DM Mono',monospace"}}>{idx.chg}</span>
              </div>
            ))
            : <div style={{padding:"7px 16px",fontSize:11,color:C.text3}}>—</div>
          }
          {lastUpd&&<div style={{display:"flex",alignItems:"center",padding:"0 16px",fontSize:10,color:C.text3,flexShrink:0,marginLeft:"auto",whiteSpace:"nowrap"}}>
            {t.lastUpdated} {lastUpd.toLocaleTimeString()}
          </div>}
        </div>
      </div>

      {/* MAIN */}
      <div style={{maxWidth:1280,margin:"0 auto",padding:"20px 20px"}}>

        {error&&(
          <div style={{background:C.redBg,border:`1px solid ${C.red}33`,borderRadius:10,padding:"12px 16px",marginBottom:16,display:"flex",gap:10,alignItems:"center",flexWrap:"wrap"}}>
            <span style={{color:C.red,fontSize:13}}>{t.error}: {error}</span>
            <button onClick={()=>fetchQuotes()} style={{background:C.red,border:"none",borderRadius:6,padding:"6px 14px",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:12,fontWeight:600,marginLeft:"auto"}}>{t.retry}</button>
          </div>
        )}

        {/* ── MARKET TABLE ── */}
        {isMarket&&(
          <div style={cardBase}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"12px 16px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap",rowGap:8}}>
              <div style={{display:"flex",gap:2,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
                {[["ALL",t.all],["US",t.us],["ASX",t.asx]].map(([v,l])=>(
                  <button key={v} className="seg" onClick={()=>setReg(v)}
                    style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontFamily:"inherit",background:region===v?C.card:"transparent",color:region===v?C.text:C.text3,fontWeight:region===v?600:400,border:region===v?`1px solid ${C.border}`:"1px solid transparent",boxShadow:region===v?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>
                    {l}
                  </button>
                ))}
              </div>
              <div style={{display:"flex",gap:2,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`}}>
                {[["ALL",t.all],["STOCK",t.stocks],["ETF",t.etf]].map(([v,l])=>(
                  <button key={v} className="seg" onClick={()=>setTypeF(v)}
                    style={{padding:"4px 12px",borderRadius:6,fontSize:12,fontFamily:"inherit",background:typeF===v?C.card:"transparent",color:typeF===v?C.text:C.text3,fontWeight:typeF===v?600:400,border:typeF===v?`1px solid ${C.border}`:"1px solid transparent",boxShadow:typeF===v?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>
                    {l}
                  </button>
                ))}
              </div>
              <span style={{marginLeft:"auto",fontSize:12,color:C.text3}}>{loading?"…":t.results(visible.length)}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse",minWidth:600}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {[
                      {col:"symbol",label:t.colSymbol,align:"left",  w:"30%"},
                      {col:"price", label:t.colPrice, align:"right", w:"12%"},
                      {col:"pct",   label:t.colChange,align:"right", w:"12%"},
                      {col:null,    label:t.colTrend, align:"center",w:"10%",cls:"hide-mobile"},
                      {col:"vol",   label:t.colVol,   align:"right", w:"13%",cls:"hide-mobile"},
                      {col:"cap",   label:t.colCap,   align:"right", w:"13%"},
                      {col:null,    label:"",          align:"center",w:"6%"},
                    ].map((h,i)=>(
                      <th key={i} className={`${h.col?"th":""} ${h.cls||""}`}
                        onClick={h.col?()=>setSort2(h.col):undefined}
                        style={{padding:"10px 16px",fontSize:11,fontWeight:500,color:C.text3,textAlign:h.align,letterSpacing:"0.04em",textTransform:"uppercase",width:h.w}}>
                        {h.label}{h.col&&<Arr col={h.col}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(8).fill(0).map((_,i)=>(
                      <tr key={i}><td colSpan={7} style={{padding:"10px 16px"}}><Skeleton h={18}/></td></tr>
                    ))
                    : visible.map((s,i)=>(
                      <tr key={s.symbol} className="tr fu" onClick={()=>openModal(s)}
                        style={{borderBottom:i<visible.length-1?`1px solid ${C.border}`:"none"}}>
                        <td style={{padding:"11px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:34,height:34,borderRadius:8,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.accent,flexShrink:0}}>
                              {s.symbol.slice(0,3)}
                            </div>
                            <div style={{minWidth:0}}>
                              <div style={{fontWeight:600,fontSize:13,display:"flex",alignItems:"center",gap:6}}>
                                {s.symbol}
                                {s.isETF&&<span style={{fontSize:9,background:C.bg2,color:C.text3,padding:"1px 5px",borderRadius:3,border:`1px solid ${C.border}`,fontWeight:600,letterSpacing:"0.04em"}}>ETF</span>}
                              </div>
                              <div style={{fontSize:11,color:C.text3,overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap",maxWidth:180}}>{s.name}</div>
                            </div>
                          </div>
                        </td>
                        <td style={{padding:"11px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:13,whiteSpace:"nowrap"}}>
                          {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                        </td>
                        <td style={{padding:"11px 16px",textAlign:"right"}}>
                          <span style={chgPill(s.pct)}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                        </td>
                        <td className="hide-mobile" style={{padding:"11px 16px",textAlign:"center"}}>
                          <Spark data={SparkData(s)} pos={s.pct>=0}/>
                        </td>
                        <td className="hide-mobile" style={{padding:"11px 16px",textAlign:"right",fontSize:12,color:C.text2,fontFamily:"'DM Mono',monospace"}}>{s.vol}</td>
                        <td style={{padding:"11px 16px",textAlign:"right",fontSize:12,color:C.text2,fontFamily:"'DM Mono',monospace"}}>{s.cap}</td>
                        <td style={{padding:"11px 16px",textAlign:"center"}}>
                          <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}}
                            style={{fontSize:16,color:watch.includes(s.symbol)?C.gold:C.border2}}>
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

        {/* ── WATCHLIST ── */}
        {tab==="watchlist"&&!query&&(
          <div>
            <div style={{marginBottom:18}}>
              <h2 style={{fontSize:20,fontWeight:700}}>{t.watchTitle}</h2>
              <p style={{fontSize:13,color:C.text3,marginTop:3}}>{t.watchSub}</p>
            </div>
            {watch.length===0
              ? <div style={{...cardBase,padding:40,textAlign:"center",color:C.text3}}>{t.watchEmpty}</div>
              : <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(240px,1fr))",gap:14}}>
                  {stocks.filter(s=>watch.includes(s.symbol)).map(s=>(
                    <div key={s.symbol} className="card" onClick={()=>openModal(s)} style={{...cardBase,padding:18}}>
                      <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                        <div style={{width:38,height:38,borderRadius:9,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent}}>
                          {s.symbol.slice(0,3)}
                        </div>
                        <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}} style={{fontSize:18,color:C.gold}}>★</span>
                      </div>
                      <div style={{fontWeight:700,fontSize:15}}>{s.symbol}</div>
                      <div style={{fontSize:11,color:C.text3,marginBottom:10}}>{s.name.length>30?s.name.slice(0,30)+"…":s.name}</div>
                      <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:19,marginBottom:4}}>
                        {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                      </div>
                      <span style={chgPill(s.pct)}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                      <div style={{marginTop:10,background:s.pct>=0?C.greenBg:C.redBg,padding:"4px 8px",borderRadius:6}}>
                        <Spark data={SparkData(s)} pos={s.pct>=0} w={200} h={50}/>
                      </div>
                      <div style={{marginTop:8,fontSize:11,color:C.text3}}>{t.mktCap} {s.cap}</div>
                    </div>
                  ))}
                </div>
            }
          </div>
        )}

        {/* ── ETF ── */}
        {tab==="etf"&&!query&&(
          <div>
            <div style={{marginBottom:18}}>
              <h2 style={{fontSize:20,fontWeight:700}}>{t.etfTitle}</h2>
              <p style={{fontSize:13,color:C.text3,marginTop:3}}>{t.etfSub}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:14}}>
              {stocks.filter(s=>s.isETF).map(s=>(
                <div key={s.symbol} className="card" onClick={()=>openModal(s)} style={{...cardBase,padding:20}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:38,height:38,borderRadius:9,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.accent}}>
                        {s.symbol.slice(0,3)}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:14}}>{s.symbol}</div>
                        <div style={{fontSize:11,color:C.text3}}>{s.region==="ASX"?"🇦🇺 ASX":"🇺🇸 US"}</div>
                      </div>
                    </div>
                    <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}} style={{fontSize:18,color:watch.includes(s.symbol)?C.gold:C.border2}}>
                      {watch.includes(s.symbol)?"★":"☆"}
                    </span>
                  </div>
                  <div style={{fontSize:12,color:C.text2,marginBottom:12,lineHeight:1.4}}>{s.name}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:17}}>
                      {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                    </span>
                    <span style={chgPill(s.pct)}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                  </div>
                  <div style={{marginTop:8,fontSize:11,color:C.text3}}>{t.scale} {s.cap}</div>
                </div>
              ))}
            </div>
          </div>
        )}

        {/* ── PORTFOLIO ── */}
        {tab==="portfolio"&&!query&&(
          <div className="fu">
            {/* Header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20,flexWrap:"wrap",gap:12}}>
              <div>
                <h2 style={{fontSize:20,fontWeight:700}}>{t.pfTitle}</h2>
                <p style={{fontSize:13,color:C.text3,marginTop:3}}>{t.pfSub}</p>
              </div>
              <button onClick={openAddPf}
                style={{background:C.accent,border:"none",borderRadius:8,padding:"9px 18px",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",gap:6}}>
                {t.pfAdd}
              </button>
            </div>

            {portfolio.length===0
              ? <div style={{...cardBase,padding:60,textAlign:"center",color:C.text3}}>
                  <div style={{fontSize:36,marginBottom:12}}>📊</div>
                  <div style={{fontSize:14}}>{t.pfEmpty}</div>
                </div>
              : <>
                  {/* Summary cards */}
                  <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fit,minmax(160px,1fr))",gap:12,marginBottom:20}}>
                    {[
                      {label:t.pfTotalValue, val:`$${pfTotalValue.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color:C.text},
                      {label:t.pfTotalCost,  val:`$${pfTotalCost.toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`,  color:C.text2},
                      {label:t.pfTotalPnl,   val:(pfTotalPnl>=0?"+":"")+`$${Math.abs(pfTotalPnl).toLocaleString("en",{minimumFractionDigits:2,maximumFractionDigits:2})}`, color:pfTotalPnl>=0?C.green:C.red},
                      {label:t.pfTotalPct,   val:(pfTotalPct>=0?"+":"")+pfTotalPct.toFixed(2)+"%", color:pfTotalPct>=0?C.green:C.red},
                    ].map((item,i)=>(
                      <div key={i} style={{...cardBase,padding:"14px 16px"}}>
                        <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:6}}>{item.label}</div>
                        <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:18,color:item.color}}>{item.val}</div>
                      </div>
                    ))}
                  </div>

                  {/* Main layout: table + donut */}
                  <div style={{display:"grid",gridTemplateColumns:"1fr auto",gap:16,alignItems:"start"}}>

                    {/* Holdings table */}
                    <div style={cardBase}>
                      <table style={{width:"100%",borderCollapse:"collapse"}}>
                        <thead>
                          <tr style={{background:C.bg}}>
                            {[t.colSymbol, t.pfCost, t.pfNow, t.pfPnl, t.pfWeight,""].map((h,i)=>(
                              <th key={i} style={{padding:"10px 16px",fontSize:11,fontWeight:500,color:C.text3,textAlign:i===0?"left":"right",letterSpacing:"0.04em",textTransform:"uppercase",whiteSpace:"nowrap"}}>
                                {h}
                              </th>
                            ))}
                          </tr>
                        </thead>
                        <tbody>
                          {pfRows.map((r,i)=>(
                            <tr key={r.symbol} className="pf-row" style={{borderTop:`1px solid ${C.border}`,cursor:"default"}}>
                              {/* symbol */}
                              <td style={{padding:"12px 16px"}}>
                                <div style={{display:"flex",alignItems:"center",gap:10}}>
                                  <div style={{width:8,height:8,borderRadius:"50%",background:PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length],flexShrink:0}}/>
                                  <div style={{width:32,height:32,borderRadius:7,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:10,fontWeight:700,color:C.accent,flexShrink:0}}>
                                    {r.symbol.slice(0,3)}
                                  </div>
                                  <div>
                                    <div style={{fontWeight:600,fontSize:13,cursor:"pointer",color:C.text}} onClick={()=>r.stock&&openModal(r.stock)}>{r.symbol}</div>
                                    <div style={{fontSize:11,color:C.text3}}>{r.stock?.name?.slice(0,24)||"—"}</div>
                                  </div>
                                </div>
                              </td>
                              {/* cost */}
                              <td style={{padding:"12px 16px",textAlign:"right",fontSize:12,fontFamily:"'DM Mono',monospace"}}>
                                <div style={{fontWeight:500}}>{r.currency}{r.cost.toFixed(2)}</div>
                                <div style={{color:C.text3,fontSize:11}}>×{r.qty}</div>
                              </td>
                              {/* now */}
                              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontSize:13,fontWeight:600}}>
                                {r.nowPrice!=null ? `${r.currency}${r.nowPrice.toFixed(2)}` : <span style={{color:C.text3,fontSize:11}}>{t.pfNoPrice}</span>}
                                {r.stock&&<div style={{fontSize:11}}><span style={chgPill(r.stock.pct)}>{r.stock.pct>=0?"▲":"▼"}{Math.abs(r.stock.pct).toFixed(2)}%</span></div>}
                              </td>
                              {/* pnl */}
                              <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace"}}>
                                {r.pnl!=null
                                  ? <>
                                      <div style={{fontWeight:700,fontSize:13,color:r.pnl>=0?C.green:C.red}}>{r.pnl>=0?"+":""}{r.currency}{Math.abs(r.pnl).toFixed(2)}</div>
                                      <div style={{fontSize:11,color:r.pnlPct>=0?C.green:C.red}}>{r.pnlPct>=0?"+":""}{r.pnlPct.toFixed(2)}%</div>
                                    </>
                                  : <span style={{color:C.text3,fontSize:12}}>—</span>
                                }
                              </td>
                              {/* weight */}
                              <td style={{padding:"12px 16px",textAlign:"right",fontSize:12,color:C.text2,fontFamily:"'DM Mono',monospace"}}>
                                {pfTotalValue>0 ? ((( r.nowTotal??r.costTotal)/pfTotalValue)*100).toFixed(1)+"%" : "—"}
                              </td>
                              {/* actions */}
                              <td style={{padding:"12px 16px",textAlign:"right",whiteSpace:"nowrap"}}>
                                <span className="pf-action" onClick={()=>openEditPf(r.i)} style={{fontSize:11,color:C.text3,cursor:"pointer",marginRight:8,padding:"3px 7px",borderRadius:5,border:`1px solid ${C.border}`}}>{t.pfEdit}</span>
                                <span className="pf-action" onClick={()=>deletePf(r.i)} style={{fontSize:11,color:C.red,cursor:"pointer",padding:"3px 7px",borderRadius:5,border:`1px solid ${C.red}44`}}>{t.pfDelete}</span>
                              </td>
                            </tr>
                          ))}
                        </tbody>
                      </table>
                    </div>

                    {/* Donut */}
                    <div style={{...cardBase,padding:20,minWidth:180,display:"flex",flexDirection:"column",alignItems:"center",gap:14}}>
                      <DonutChart slices={donutSlices} size={130}/>
                      <div style={{width:"100%"}}>
                        {pfRows.map((r,i)=>(
                          <div key={r.symbol} style={{display:"flex",alignItems:"center",justifyContent:"space-between",padding:"4px 0",fontSize:12}}>
                            <div style={{display:"flex",alignItems:"center",gap:6}}>
                              <div style={{width:8,height:8,borderRadius:"50%",background:PORTFOLIO_COLORS[i%PORTFOLIO_COLORS.length]}}/>
                              <span style={{fontWeight:600}}>{r.symbol}</span>
                            </div>
                            <span style={{color:C.text3,fontFamily:"'DM Mono',monospace"}}>
                              {pfTotalValue>0?(((r.nowTotal??r.costTotal)/pfTotalValue)*100).toFixed(1)+"%":"—"}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                  </div>
                </>
            }
          </div>
        )}
      </div>

      {/* ── STOCK MODAL ── */}
      {modal&&(
        <div className="modal-wrap" style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.4)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div className="modal-inner" style={{background:C.card,borderRadius:16,border:`1px solid ${C.border}`,width:"100%",maxWidth:600,maxHeight:"88vh",overflowY:"auto",padding:24,boxShadow:"0 24px 64px rgba(0,0,0,0.15)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:18}}>
              <div style={{display:"flex",alignItems:"center",gap:12}}>
                <div style={{width:44,height:44,borderRadius:10,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:13,fontWeight:700,color:C.accent}}>
                  {modal.symbol.slice(0,3)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:18}}>{modal.symbol}</div>
                  <div style={{fontSize:12,color:C.text3}}>{modal.name}</div>
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,width:32,height:32,cursor:"pointer",fontSize:16,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>
            <div style={{marginBottom:6,display:"flex",alignItems:"baseline",gap:10,flexWrap:"wrap"}}>
              <span style={{fontFamily:"'DM Mono',monospace",fontSize:36,fontWeight:700,letterSpacing:"-1px"}}>
                {modal.region==="ASX"?"A$":"$"}{modal.price?.toFixed(2)}
              </span>
              <span style={chgPill(modal.pct)}>{modal.pct>=0?"▲":"▼"} {Math.abs(modal.pct).toFixed(2)}%</span>
              <span style={{fontSize:12,color:modal.change>=0?C.green:C.red,opacity:0.8}}>({modal.change>=0?"+":""}{modal.change?.toFixed(2)})</span>
            </div>
            {(modal.preMarket?.price||modal.postMarket?.price)&&(
              <div style={{display:"flex",gap:8,marginBottom:14,flexWrap:"wrap"}}>
                {modal.preMarket?.price&&(
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",fontSize:11,display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{color:C.text3}}>{t.preMarket}</span>
                    <span style={{fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{modal.region==="ASX"?"A$":"$"}{modal.preMarket.price.toFixed(2)}</span>
                    {modal.preMarket.pct!=null&&<span style={{color:modal.preMarket.pct>=0?C.green:C.red,fontWeight:600}}>{modal.preMarket.pct>=0?"+":""}{modal.preMarket.pct}%</span>}
                  </div>
                )}
                {modal.postMarket?.price&&(
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:7,padding:"4px 10px",fontSize:11,display:"flex",gap:6,alignItems:"center"}}>
                    <span style={{color:C.text3}}>{t.postMarket}</span>
                    <span style={{fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{modal.region==="ASX"?"A$":"$"}{modal.postMarket.price.toFixed(2)}</span>
                    {modal.postMarket.pct!=null&&<span style={{color:modal.postMarket.pct>=0?C.green:C.red,fontWeight:600}}>{modal.postMarket.pct>=0?"+":""}{modal.postMarket.pct}%</span>}
                  </div>
                )}
              </div>
            )}
            <div style={{display:"flex",gap:4,marginBottom:10,flexWrap:"wrap"}}>
              {["today","1wk","1mo","3mo","6mo","1y","2y"].map(p=>(
                <button key={p} className="period-btn" onClick={()=>setHP(p)}
                  style={{padding:"4px 10px",borderRadius:6,fontSize:11,fontFamily:"inherit",background:histPeriod===p?C.accent:"transparent",color:histPeriod===p?"#fff":C.text3,fontWeight:histPeriod===p?600:400,border:`1px solid ${histPeriod===p?C.accent:C.border}`}}>
                  {p==="today"?t.intraday:p}
                </button>
              ))}
            </div>
            <div style={{borderRadius:8,overflow:"hidden",background:modal.pct>=0?C.greenBg:C.redBg,padding:"8px 10px",marginBottom:16,border:`1px solid ${C.border}`}}>
              {history.length>0
                ?<AreaChart closes={history} pos={modal.pct>=0} h={100}/>
                :<div style={{height:100,display:"flex",alignItems:"center",justifyContent:"center"}}><Skeleton h={100}/></div>
              }
            </div>
            <div className="stat-grid" style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:8,marginBottom:16}}>
              {[[t.mktCap,modal.cap],[t.vol,modal.vol],[t.pe,modal.pe??t.na],[t.exchange,modal.mkt],[t.sector,modal.sector],[t.type,modal.isETF?t.etfType:t.stockType]].map(([k,v])=>(
                <div key={k} style={{background:C.bg,borderRadius:8,padding:"9px 12px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:10,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:3}}>{k}</div>
                  <div style={{fontWeight:600,fontSize:13,fontFamily:"'DM Mono',monospace",overflow:"hidden",textOverflow:"ellipsis",whiteSpace:"nowrap"}}>{v}</div>
                </div>
              ))}
            </div>
            <div style={{background:C.bg,borderRadius:10,padding:14,border:`1px solid ${C.border}`,marginBottom:14}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:24,height:24,borderRadius:6,background:C.accent,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:11,fontWeight:700}}>✦</div>
                <span style={{fontWeight:600,fontSize:13}}>{t.aiTitle}</span>
                <span style={{fontSize:10,color:C.text3,background:C.bg2,padding:"2px 7px",borderRadius:8,border:`1px solid ${C.border}`}}>Claude</span>
                {!aiText&&!aiLoad&&(
                  <button className="ai-btn" onClick={()=>runAI(modal)}
                    style={{marginLeft:"auto",background:C.accent,borderRadius:7,padding:"6px 14px",color:"#fff",fontFamily:"inherit",fontSize:12,fontWeight:600}}>
                    {t.aiGenerate}
                  </button>
                )}
              </div>
              {aiLoad&&(
                <div style={{display:"flex",alignItems:"center",gap:8,color:C.text3,fontSize:12}}>
                  <div style={{width:13,height:13,borderRadius:"50%",border:`2px solid ${C.accent}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                  {aiMsg}
                </div>
              )}
              {!aiLoad&&!aiText&&<p style={{fontSize:12,color:C.text3,lineHeight:1.6}}>{t.aiHint}</p>}
              {aiText&&<div style={{fontSize:13,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}} className="fu">{aiText}</div>}
            </div>
            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>toggleWatch(modal.symbol)}
                style={{flex:1,background:watch.includes(modal.symbol)?C.accent:C.bg,border:`1px solid ${watch.includes(modal.symbol)?C.accent:C.border}`,borderRadius:8,padding:"9px",color:watch.includes(modal.symbol)?"#fff":C.text3,fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer"}}>
                {watch.includes(modal.symbol)?t.inWatch:t.addWatch}
              </button>
              {aiText&&(
                <button onClick={()=>runAI(modal)}
                  style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"9px",color:C.text3,fontFamily:"inherit",fontSize:13,fontWeight:500,cursor:"pointer"}}>
                  {t.aiRetry}
                </button>
              )}
            </div>
          </div>
        </div>
      )}

{/* ── NEWS ── */}
        {tab==="news"&&!query&&(
          <div className="fu">
            <div style={{marginBottom:18}}>
              <h2 style={{fontSize:20,fontWeight:700}}>{t.newsTitle}</h2>
              <p style={{fontSize:13,color:C.text3,marginTop:3}}>{t.newsSub}</p>
            </div>

            {/* Region filter */}
            <div style={{display:"flex",gap:2,background:C.bg,borderRadius:8,padding:3,border:`1px solid ${C.border}`,width:"fit-content",marginBottom:20}}>
              {[["ALL",t.newsAll],["US",t.newsUS],["ASX",t.newsASX]].map(([v,l])=>(
                <button key={v} className="seg" onClick={()=>setNReg(v)}
                  style={{padding:"4px 14px",borderRadius:6,fontSize:12,fontFamily:"inherit",background:newsReg===v?C.card:"transparent",color:newsReg===v?C.text:C.text3,fontWeight:newsReg===v?600:400,border:newsReg===v?`1px solid ${C.border}`:"1px solid transparent",boxShadow:newsReg===v?"0 1px 2px rgba(0,0,0,0.06)":"none"}}>
                  {l}
                </button>
              ))}
            </div>

            {/* Fetch news on mount */}
            {news.length===0&&!newsLoad&&(()=>{
              setNLoad(true);
              fetch(`${API}/news`).then(r=>r.json()).then(j=>{setNews(j.data||[]);setNLoad(false);}).catch(()=>setNLoad(false));
              return null;
            })()}

            {newsLoad&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {Array(6).fill(0).map((_,i)=>(
                  <div key={i} style={{...cardBase,padding:18}}>
                    <Skeleton h={14} w="60%" radius={4}/>
                    <div style={{marginTop:10}}><Skeleton h={12} radius={4}/></div>
                    <div style={{marginTop:6}}><Skeleton h={12} w="80%" radius={4}/></div>
                    <div style={{marginTop:12}}><Skeleton h={10} w="40%" radius={4}/></div>
                  </div>
                ))}
              </div>
            )}

            {!newsLoad&&news.length===0&&(
              <div style={{...cardBase,padding:40,textAlign:"center",color:C.text3}}>{t.newsEmpty}</div>
            )}

            {!newsLoad&&news.length>0&&(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(300px,1fr))",gap:14}}>
                {news
                  .filter(n=>newsReg==="ALL"||n.region===newsReg)
                  .map((n,i)=>(
                    <a key={i} href={n.link} target="_blank" rel="noopener noreferrer"
                      style={{textDecoration:"none",color:"inherit",display:"block"}}>
                      <div className="news-card" style={{...cardBase,padding:18,transition:"all 0.18s",cursor:"pointer"}}>
                        <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:10,gap:8}}>
                          <span style={{fontSize:10,background:C.bg2,border:`1px solid ${C.border}`,borderRadius:5,padding:"2px 8px",fontWeight:600,color:C.text3,letterSpacing:"0.04em",flexShrink:0}}>
                            {n.symbol}
                          </span>
                          <span style={{fontSize:10,color:n.region==="ASX"?"#0ea5e9":"#8b5cf6",fontWeight:600,flexShrink:0}}>
                            {n.region==="ASX"?"🇦🇺 ASX":"🇺🇸 US"}
                          </span>
                          <span style={{fontSize:10,color:C.text3,marginLeft:"auto",flexShrink:0}}>
                            {n.published ? new Date(n.published*1000).toLocaleDateString() : ""}
                          </span>
                        </div>
                        <div style={{fontSize:13,fontWeight:600,lineHeight:1.5,color:C.text,marginBottom:8,display:"-webkit-box",WebkitLineClamp:3,WebkitBoxOrient:"vertical",overflow:"hidden"}}>
                          {n.title}
                        </div>
                        <div style={{fontSize:11,color:C.text3}}>{n.source}</div>
                      </div>
                    </a>
                  ))
                }
              </div>
            )}
          </div>
        )}
      {/* ── PORTFOLIO ADD/EDIT MODAL ── */}
      {pfModal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(0,0,0,0.45)",zIndex:300,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setPfModal(false)}>
          <div style={{background:C.card,borderRadius:14,border:`1px solid ${C.border}`,width:"100%",maxWidth:420,padding:24,boxShadow:"0 20px 60px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:20}}>
              <span style={{fontWeight:700,fontSize:16}}>{pfEditing!=null?t.pfEdit:t.pfAdd}</span>
              <button onClick={()=>setPfModal(false)} style={{background:C.bg,border:`1px solid ${C.border}`,borderRadius:7,width:30,height:30,cursor:"pointer",fontSize:15,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            {/* Symbol */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:500,color:C.text2,display:"block",marginBottom:6}}>{t.pfSymbol}</label>
              <input
                value={pfForm.symbol}
                onChange={e=>setPfForm(f=>({...f,symbol:e.target.value.toUpperCase()}))}
                placeholder="AAPL / BHP / VAS…"
                disabled={pfEditing!=null}
                style={{width:"100%",height:38,borderRadius:8,border:`1px solid ${C.border}`,background:pfEditing!=null?C.bg:C.card,padding:"0 12px",fontSize:14,fontFamily:"'DM Mono',monospace",fontWeight:600,color:C.text}}
              />
            </div>

            {/* Qty */}
            <div style={{marginBottom:14}}>
              <label style={{fontSize:12,fontWeight:500,color:C.text2,display:"block",marginBottom:6}}>{t.pfQty}</label>
              <input
                type="number" min="0" step="any"
                value={pfForm.qty}
                onChange={e=>setPfForm(f=>({...f,qty:e.target.value}))}
                placeholder="100"
                style={{width:"100%",height:38,borderRadius:8,border:`1px solid ${C.border}`,background:C.card,padding:"0 12px",fontSize:14,fontFamily:"'DM Mono',monospace",color:C.text}}
              />
            </div>

            {/* Avg cost */}
            <div style={{marginBottom:18}}>
              <label style={{fontSize:12,fontWeight:500,color:C.text2,display:"block",marginBottom:6}}>{t.pfAvgCost}</label>
              <input
                type="number" min="0" step="any"
                value={pfForm.cost}
                onChange={e=>setPfForm(f=>({...f,cost:e.target.value}))}
                placeholder="182.50"
                style={{width:"100%",height:38,borderRadius:8,border:`1px solid ${C.border}`,background:C.card,padding:"0 12px",fontSize:14,fontFamily:"'DM Mono',monospace",color:C.text}}
              />
            </div>

            {pfError&&<div style={{background:C.redBg,border:`1px solid ${C.red}44`,borderRadius:7,padding:"8px 12px",fontSize:12,color:C.red,marginBottom:14}}>{pfError}</div>}

            <div style={{display:"flex",gap:8}}>
              <button onClick={()=>setPfModal(false)}
                style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:8,padding:"10px",color:C.text3,fontFamily:"inherit",fontSize:13,fontWeight:500,cursor:"pointer"}}>
                {t.pfCancel}
              </button>
              <button onClick={savePf} disabled={pfSearching}
                style={{flex:2,background:C.accent,border:"none",borderRadius:8,padding:"10px",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600,cursor:"pointer",display:"flex",alignItems:"center",justifyContent:"center",gap:6}}>
                {pfSearching&&<div style={{width:12,height:12,borderRadius:"50%",border:"2px solid rgba(255,255,255,0.4)",borderTopColor:"#fff",animation:"spin 0.8s linear infinite"}}/>}
                {t.pfSave}
              </button>
            </div>
          </div>
        </div>
      )}

    </div>
  );
}
