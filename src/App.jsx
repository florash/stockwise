import { useState, useEffect, useCallback, useRef } from "react";

/* ── config ───────────────────────────────────────────────────────── */
const API = "https://stockwise-76dt.onrender.com";

/* ── palette ─────────────────────────────────────────────────────── */
const C = {
  bg:"#faf6ef", bg2:"#f5efe3", card:"#fffdf8", border:"#e8dfc8",
  border2:"#d4c49a", gold:"#b8933e", goldD:"#8a6c28", goldL:"#e8d5a3",
  goldBg:"#fdf4dc", text:"#2c2416", text2:"#6b5b3e", text3:"#a8956e",
  green:"#2d7a4f", greenBg:"#edf7f1", red:"#c0392b", redBg:"#fdf0ee",
};

/* ── default symbols ─────────────────────────────────────────────── */
const DEFAULT_SYMBOLS = [
  "AAPL","NVDA","MSFT","TSLA","AMZN","META",
  "SPY","QQQ","VTI","IVV",
  "BHP","CBA","CSL","RIO","NAB","WBC",
  "VAS","NDQ","A200",
];

/* ── i18n ─────────────────────────────────────────────────────────── */
const T = {
  zh:{
    brand:"Stockwise", searchPh:"输入任意代码按 Enter 搜索，如 GOOG、700.HK...",
    simulated:"延迟行情", tabMarket:"市场", tabWatch:"自选股", tabEtf:"ETF",
    all:"全部", us:"🇺🇸 美股", asx:"🇦🇺 澳股", stocks:"个股", etf:"ETF",
    results:(n)=>`${n} 条结果`, colSymbol:"代码", colPrice:"价格",
    colChange:"涨跌幅", colTrend:"走势", colVol:"成交量", colCap:"市值",
    watchTitle:"自选股", watchSub:"点击 ★ 添加或移除",
    watchEmpty:"暂无自选股", etfTitle:"ETF 筛选器",
    etfSub:"美股 & 澳股主流 ETF",
    scale:"规模", mktCap:"市值", vol:"成交量", pe:"市盈率",
    exchange:"交易所", sector:"板块", type:"类型",
    etfType:"ETF", stockType:"个股",
    aiTitle:"AI 智能分析", aiGenerate:"生成分析 →",
    aiHint:"点击「生成分析」，Claude AI 将从近期表现、投资逻辑、风险三个维度进行专业分析。",
    aiAnalyzing:["分析财务数据中…","获取市场情绪…","生成分析报告…"],
    aiRetry:"↻ 重新分析", addWatch:"☆ 加入自选", inWatch:"★ 已加自选",
    na:"N/A", gold:"黄金", loading:"加载行情数据…", error:"数据加载失败",
    retry:"重试", backendTip:"请确认后端已启动：uvicorn main:app --reload",
    refreshing:"更新中…", lastUpdated:"更新时间",
    preMarket:"盘前", postMarket:"盘后", intraday:"分时",
    aiPrompt:(s)=>`你是一位专业的证券分析师。请用简洁的中文（约200字）分析：\n股票：${s.name}（${s.symbol}）| 市场：${s.mkt} | 板块：${s.sector}\n价格：${s.price} | 涨跌：${s.pct}% | 市值：${s.cap}${s.pe?` | P/E：${s.pe}`:"（ETF）"}\n\n请简明分析：1）近期表现 2）核心投资逻辑 3）主要风险。专业客观。`,
  },
  en:{
    brand:"Stockwise", searchPh:"Search stocks / ETFs, e.g. AAPL, BHP…",
    simulated:"Delayed", tabMarket:"Market", tabWatch:"Watchlist", tabEtf:"ETFs",
    all:"All", us:"🇺🇸 US", asx:"🇦🇺 ASX", stocks:"Stocks", etf:"ETF",
    results:(n)=>`${n} results`, colSymbol:"Symbol / Name", colPrice:"Price",
    colChange:"Change", colTrend:"Trend", colVol:"Volume", colCap:"Mkt Cap",
    watchTitle:"Watchlist", watchSub:"Click ★ to add or remove",
    watchEmpty:"No stocks in watchlist", etfTitle:"ETF Explorer",
    etfSub:"Top US & ASX ETFs",
    scale:"AUM", mktCap:"Mkt Cap", vol:"Volume", pe:"P/E",
    exchange:"Exchange", sector:"Sector", type:"Type",
    etfType:"ETF", stockType:"Stock",
    aiTitle:"AI Analysis", aiGenerate:"Analyse →",
    aiHint:"Click 'Analyse' — Claude AI will assess performance, investment thesis, and key risks.",
    aiAnalyzing:["Analysing financials…","Reading sentiment…","Generating report…"],
    aiRetry:"↻ Re-analyse", addWatch:"☆ Add to Watchlist", inWatch:"★ In Watchlist",
    na:"N/A", gold:"Gold", loading:"Loading market data…", error:"Failed to load data",
    retry:"Retry", backendTip:"Make sure the backend is running: uvicorn main:app --reload",
    refreshing:"Refreshing…", lastUpdated:"Updated",
    preMarket:"Pre", postMarket:"Post", intraday:"Today",
    aiPrompt:(s)=>`You are a professional securities analyst. Provide a concise analysis (~150 words) of:\nStock: ${s.name} (${s.symbol}) | Market: ${s.mkt} | Sector: ${s.sector}\nPrice: ${s.price} | Change: ${s.pct}% | Mkt Cap: ${s.cap}${s.pe?` | P/E: ${s.pe}`:" (ETF)"}\n\nCover: 1) Recent performance 2) Core investment thesis 3) Key risks. Professional and objective.`,
  },
};

/* ── sparkline ───────────────────────────────────────────────────── */
function Spark({data, pos, w=72, h=28}){
  if(!data||data.length<2) return <svg width={w} height={h}/>;
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const pts=data.map((v,i)=>`${(i/(data.length-1))*w},${h-((v-mn)/rng)*(h-4)-2}`).join(" ");
  return(
    <svg width={w} height={h} style={{display:"block"}}>
      <polyline points={pts} fill="none" stroke={pos?C.green:C.red} strokeWidth="1.5" strokeLinejoin="round"/>
    </svg>
  );
}

/* ── area chart ──────────────────────────────────────────────────── */
function AreaChart({closes, pos, h=110}){
  if(!closes||closes.length<2) return(
    <div style={{height:h,display:"flex",alignItems:"center",justifyContent:"center",color:C.text3,fontSize:13}}>
      暂无历史数据
    </div>
  );
  const data=closes.map(d=>d.close);
  const mn=Math.min(...data),mx=Math.max(...data),rng=mx-mn||1;
  const W=560;
  const pts=data.map((v,i)=>[(i/(data.length-1))*W, h-((v-mn)/rng)*(h-12)-6]);
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

/* ── skeleton ────────────────────────────────────────────────────── */
function Skeleton({w="100%",h=16,radius=4}){
  return(
    <div style={{
      width:w, height:h, borderRadius:radius,
      background:`linear-gradient(90deg, ${C.border} 25%, ${C.goldBg} 50%, ${C.border} 75%)`,
      backgroundSize:"200% 100%", animation:"shimmer 1.4s infinite",
    }}/>
  );
}

/* ── main app ────────────────────────────────────────────────────── */
export default function App(){
  const [lang,setLang]   = useState("zh");
  const [tab,setTab]     = useState("market");
  const [region,setReg]  = useState("ALL");
  const [typeF,setTypeF] = useState("ALL");
  const [query,setQuery] = useState("");
  const [sort,setSort]   = useState({col:"cap",dir:-1});
  const [watch,setWatch] = useState(["AAPL","BHP","SPY","VAS","NVDA"]);
  const [modal,setModal] = useState(null);
  const [history,setHist]= useState([]);
  const [histPeriod,setHP]= useState("1mo");
  const [aiText,setAiT]  = useState("");
  const [aiLoad,setAiL]  = useState(false);
  const [aiMsg,setAiMsg] = useState("");
  const [indices,setIndices] = useState([]);
  const searchTimer = useRef(null);

  const [stocks,setStocks]     = useState([]);
  const [loading,setLoad]      = useState(true);
  const [error,setError]       = useState(null);
  const [lastUpd,setLastU]     = useState(null);
  const [refreshing,setRef]    = useState(false);

  const t = T[lang];

  /* ── fetch quotes ── */
  const fetchQuotes = useCallback(async(isRefresh=false)=>{
    if(isRefresh) setRef(true); else setLoad(true);
    setError(null);
    try{
      const syms = DEFAULT_SYMBOLS.join(",");
      const res  = await fetch(`${API}/quotes?symbols=${syms}`);
      if(!res.ok) throw new Error(`HTTP ${res.status}`);
      const json = await res.json();
      const valid = json.data.filter(s=>s.price!=null&&!s.error);
      setStocks(valid);
      setLastU(new Date());
    } catch(e){
      setError(e.message);
    } finally{
      setLoad(false); setRef(false);
    }
  },[]);

  useEffect(()=>{ fetchQuotes(); },[fetchQuotes]);

  /* ── fetch indices ── */
  useEffect(()=>{
    fetch(`${API}/indices`)
      .then(r=>r.json())
      .then(j=>setIndices(j.data||[]))
      .catch(()=>{});
  },[]);

  /* ── auto-refresh every 60s ── */
  useEffect(()=>{
    const iv = setInterval(()=>fetchQuotes(true), 60000);
    return ()=>clearInterval(iv);
  },[fetchQuotes]);

  /* ── fetch history / intraday when modal opens ── */
  useEffect(()=>{
    if(!modal) return;
    setHist([]);
    const sym = modal.yahooSym || modal.symbol;
    if(histPeriod === "today"){
      fetch(`${API}/intraday?symbol=${sym}`)
        .then(r=>r.json())
        .then(j=>{
          const converted = (j.data||[]).map(d=>({date:d.time, close:d.close}));
          setHist(converted);
        })
        .catch(()=>setHist([]));
    } else {
      fetch(`${API}/history?symbol=${sym}&period=${histPeriod}`)
        .then(r=>r.json())
        .then(j=>setHist(j.data||[]))
        .catch(()=>setHist([]));
    }
  },[modal,histPeriod]);

  /* ── filter + sort ── */
  const pn = v=>parseFloat(String(v).replace(/[^0-9.]/g,""));
  const visible = stocks.filter(s=>{
    const mr = region==="ALL"||s.region===region;
    const mt = typeF==="ALL"||(typeF==="ETF"&&s.isETF)||(typeF==="STOCK"&&!s.isETF);
    const mq = !query||s.symbol.toLowerCase().includes(query.toLowerCase())||s.name.toLowerCase().includes(query.toLowerCase());
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
  const Arr=({col})=>sort.col!==col
    ?<span style={{opacity:0.3}}>↕</span>
    :<span>{sort.dir===-1?"↓":"↑"}</span>;

  const toggleWatch = sym=>setWatch(p=>p.includes(sym)?p.filter(s=>s!==sym):[...p,sym]);
  const openModal   = s=>{ setModal(s); setAiT(""); setHP("1mo"); };

  /* ── AI analysis ── */
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

  /* ── styles ── */
  const isMarket=tab==="market"||!!query;
  const cardBase={background:C.card,border:`1px solid ${C.border}`,borderRadius:14,boxShadow:"0 1px 4px rgba(184,147,62,0.07)"};
  const pill=active=>({padding:"5px 15px",borderRadius:8,fontSize:13,fontFamily:"inherit",background:active?C.card:"transparent",color:active?C.text:C.text3,fontWeight:active?600:400,boxShadow:active?"0 1px 3px rgba(184,147,62,0.15)":"none",border:active?`1px solid ${C.border}`:"1px solid transparent"});
  const chgPill=pct=>({display:"inline-flex",alignItems:"center",gap:4,background:pct>=0?C.greenBg:C.redBg,color:pct>=0?C.green:C.red,padding:"3px 10px",borderRadius:20,fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"});

  const SparkData = (s) => {
    const base=s.price||100; const n=20; const d=[]; let p=base*0.97;
    for(let i=0;i<n;i++){ p+=((Math.random()-0.48)*base*0.003); d.push(p); }
    d[n-1]=s.price||base;
    return d;
  };

  const css=`
@import url('https://fonts.googleapis.com/css2?family=Cormorant+Garamond:wght@400;500;600;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500;9..40,600&family=DM+Mono:wght@400;500&display=swap');
*,*::before,*::after{box-sizing:border-box;margin:0;padding:0}
body{background:${C.bg}}
::-webkit-scrollbar{width:5px;height:5px}
::-webkit-scrollbar-track{background:${C.bg}}
::-webkit-scrollbar-thumb{background:${C.border};border-radius:4px}
input::placeholder{color:${C.text3}}
input:focus{outline:none;border-color:${C.gold}!important;box-shadow:0 0 0 3px ${C.goldL}55}
.tr{transition:background 0.1s;cursor:pointer}
.tr:hover{background:${C.goldBg}!important}
.tab{transition:all 0.14s;cursor:pointer;border:none;background:none;font-family:inherit}
.tab:hover{color:${C.text}!important}
.seg{transition:all 0.12s;cursor:pointer;border:none;font-family:inherit;user-select:none}
.seg:hover{opacity:0.75}
.card{transition:all 0.18s;cursor:pointer}
.card:hover{box-shadow:0 8px 28px rgba(184,147,62,0.14)!important;transform:translateY(-2px);border-color:${C.border2}!important}
.star{cursor:pointer;transition:transform 0.15s;user-select:none;display:inline-block}
.star:hover{transform:scale(1.25)}
.th{cursor:pointer;user-select:none}
.th:hover{color:${C.text}!important}
.ai-btn{transition:all 0.15s;cursor:pointer;border:none}
.ai-btn:hover{background:${C.goldD}!important}
.lang-btn{transition:all 0.15s;cursor:pointer}
.lang-btn:hover{border-color:${C.gold}!important;color:${C.gold}!important}
.period-btn{transition:all 0.12s;cursor:pointer;border:none;font-family:inherit}
.period-btn:hover{background:${C.goldBg}!important}
@keyframes spin{to{transform:rotate(360deg)}}
@keyframes fu{from{opacity:0;transform:translateY(8px)}to{opacity:1;transform:translateY(0)}}
.fu{animation:fu 0.28s ease forwards}
@keyframes shimmer{0%{background-position:200% 0}100%{background-position:-200% 0}}
`;

  return(
    <div style={{fontFamily:"'DM Sans',sans-serif",color:C.text,minHeight:"100vh",background:C.bg}}>
      <style>{css}</style>

      {/* ── HEADER ── */}
      <div style={{background:C.card,borderBottom:`1px solid ${C.border}`,position:"sticky",top:0,zIndex:100}}>
        <div style={{maxWidth:1200,margin:"0 auto",padding:"0 24px"}}>
          <div style={{display:"flex",alignItems:"center",gap:24,height:56}}>
            <div style={{display:"flex",alignItems:"center",gap:10,flexShrink:0}}>
              <div style={{width:32,height:32,borderRadius:8,background:C.gold,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontWeight:700,fontSize:16,fontFamily:"'Cormorant Garamond',serif"}}>S</div>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontWeight:700,fontSize:22,color:C.text,letterSpacing:"-0.3px"}}>{t.brand}</span>
            </div>
            <input
              placeholder={t.searchPh}
              onChange={e=>{
                const val=e.target.value;
                clearTimeout(searchTimer.current);
                searchTimer.current=setTimeout(()=>setQuery(val),400);
              }}
              style={{flex:1,height:36,borderRadius:10,border:`1px solid ${C.border}`,background:C.bg,padding:"0 14px",fontSize:14,color:C.text,fontFamily:"inherit"}}
            />
            <nav style={{display:"flex",gap:4}}>
              {[["market",t.tabMarket],["watchlist",t.tabWatch],["etf",t.tabEtf]].map(([v,l])=>(
                <button key={v} className="tab" onClick={()=>{setTab(v);setQuery("");}}
                  style={{padding:"6px 16px",fontSize:14,fontWeight:tab===v?600:400,color:tab===v?C.text:C.text3,borderBottom:tab===v?`2px solid ${C.gold}`:"2px solid transparent"}}>
                  {l}
                </button>
              ))}
            </nav>
            <button className="lang-btn" onClick={()=>setLang(l=>l==="zh"?"en":"zh")}
              style={{padding:"4px 12px",borderRadius:7,border:`1px solid ${C.border}`,background:"transparent",fontSize:13,color:C.text3,cursor:"pointer"}}>
              {lang==="zh"?"EN":"中"}
            </button>
          </div>
        </div>
      </div>

      {/* ── TICKER BAR ── */}
      <div style={{background:C.bg2,borderBottom:`1px solid ${C.border}`,overflow:"hidden"}}>
        <div style={{display:"flex",gap:0,overflowX:"auto",padding:"0 24px"}}>
          {indices.length>0
            ? indices.map((idx,i)=>(
              <div key={i} style={{display:"flex",alignItems:"center",gap:8,padding:"8px 20px",borderRight:`1px solid ${C.border}`,flexShrink:0}}>
                <span style={{fontSize:12,color:C.text3,fontWeight:500}}>{idx.name}</span>
                <span style={{fontSize:13,fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{idx.val}</span>
                <span style={{fontSize:12,fontWeight:600,color:idx.pos?C.green:C.red,fontFamily:"'DM Mono',monospace"}}>{idx.chg}</span>
              </div>
            ))
            : <div style={{padding:"8px 20px",fontSize:12,color:C.text3}}>
                {refreshing ? t.refreshing : "—"}
              </div>
          }
          {lastUpd&&<div style={{display:"flex",alignItems:"center",padding:"0 20px",fontSize:11,color:C.text3,flexShrink:0,marginLeft:"auto"}}>
            ● {t.simulated} · {t.lastUpdated}: {lastUpd.toLocaleTimeString()}
          </div>}
        </div>
      </div>

      {/* ── MAIN ── */}
      <div style={{maxWidth:1200,margin:"0 auto",padding:"24px 24px"}}>

        {/* error */}
        {error&&(
          <div style={{background:C.redBg,border:`1px solid ${C.red}33`,borderRadius:12,padding:"14px 18px",marginBottom:20,display:"flex",gap:12,alignItems:"center"}}>
            <span style={{color:C.red,fontSize:14}}>{t.error}: {error}</span>
            <span style={{color:C.text3,fontSize:12}}>{t.backendTip}</span>
            <button onClick={()=>fetchQuotes()} style={{background:C.red,border:"none",borderRadius:8,padding:"8px 16px",color:"#fff",cursor:"pointer",fontFamily:"inherit",fontSize:13,fontWeight:600}}>{t.retry}</button>
          </div>
        )}

        {/* ── MARKET TABLE ── */}
        {isMarket&&(
          <div style={{...cardBase}}>
            <div style={{display:"flex",alignItems:"center",gap:8,padding:"14px 18px",borderBottom:`1px solid ${C.border}`,flexWrap:"wrap"}}>
              <div style={{display:"flex",gap:4,background:C.bg,borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
                {[["ALL",t.all],["US",t.us],["ASX",t.asx]].map(([v,l])=>(
                  <button key={v} className="seg" onClick={()=>setReg(v)} style={pill(region===v)}>{l}</button>
                ))}
              </div>
              <div style={{display:"flex",gap:4,background:C.bg,borderRadius:10,padding:4,border:`1px solid ${C.border}`}}>
                {[["ALL",t.all],["STOCK",t.stocks],["ETF",t.etf]].map(([v,l])=>(
                  <button key={v} className="seg" onClick={()=>setTypeF(v)} style={pill(typeF===v)}>{l}</button>
                ))}
              </div>
              <span style={{marginLeft:"auto",fontSize:13,color:C.text3}}>{loading?"…":t.results(visible.length)}</span>
            </div>
            <div style={{overflowX:"auto"}}>
              <table style={{width:"100%",borderCollapse:"collapse"}}>
                <thead>
                  <tr style={{background:C.bg}}>
                    {[
                      {col:"symbol",label:t.colSymbol,align:"left"},
                      {col:"price", label:t.colPrice, align:"right"},
                      {col:"pct",   label:t.colChange,align:"right"},
                      {col:null,    label:t.colTrend, align:"center"},
                      {col:"vol",   label:t.colVol,   align:"right"},
                      {col:"cap",   label:t.colCap,   align:"right"},
                      {col:null,    label:"",          align:"center"},
                    ].map((h,i)=>(
                      <th key={i} className={h.col?"th":""} onClick={h.col?()=>setSort2(h.col):undefined}
                        style={{padding:"11px 16px",fontSize:11,fontWeight:600,color:C.text3,textAlign:h.align,letterSpacing:"0.06em",textTransform:"uppercase"}}>
                        {h.label}{h.col&&<Arr col={h.col}/>}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {loading
                    ? Array(8).fill(0).map((_,i)=>(
                      <tr key={i}><td colSpan={7} style={{padding:"12px 16px"}}><Skeleton h={20}/></td></tr>
                    ))
                    : visible.map((s,i)=>(
                      <tr key={s.symbol} className="tr fu" onClick={()=>openModal(s)}
                        style={{borderBottom:i<visible.length-1?`1px solid ${C.border}`:"none"}}>
                        <td style={{padding:"12px 16px"}}>
                          <div style={{display:"flex",alignItems:"center",gap:10}}>
                            <div style={{width:36,height:36,borderRadius:9,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:11,fontWeight:700,color:C.goldD,flexShrink:0}}>
                              {s.symbol.slice(0,3)}
                            </div>
                            <div>
                              <div style={{fontWeight:600,fontSize:14}}>{s.symbol}</div>
                              <div style={{fontSize:12,color:C.text3}}>{s.name.length>28?s.name.slice(0,28)+"…":s.name}</div>
                            </div>
                            {s.isETF&&<span style={{fontSize:10,background:C.goldBg,color:C.goldD,padding:"1px 6px",borderRadius:4,border:`1px solid ${C.border}`,fontWeight:600}}>ETF</span>}
                          </div>
                        </td>
                        <td style={{padding:"12px 16px",textAlign:"right",fontFamily:"'DM Mono',monospace",fontWeight:600,fontSize:14}}>
                          {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                        </td>
                        <td style={{padding:"12px 16px",textAlign:"right"}}>
                          <span style={chgPill(s.pct)}>
                            {s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%
                          </span>
                        </td>
                        <td style={{padding:"12px 16px",textAlign:"center"}}>
                          <Spark data={SparkData(s)} pos={s.pct>=0}/>
                        </td>
                        <td style={{padding:"12px 16px",textAlign:"right",fontSize:13,color:C.text2,fontFamily:"'DM Mono',monospace"}}>{s.vol}</td>
                        <td style={{padding:"12px 16px",textAlign:"right",fontSize:13,color:C.text2,fontFamily:"'DM Mono',monospace"}}>{s.cap}</td>
                        <td style={{padding:"12px 16px",textAlign:"center"}}>
                          <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}}
                            style={{fontSize:18,color:watch.includes(s.symbol)?C.gold:C.border2}}>
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
            <div style={{marginBottom:20}}>
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600}}>{t.watchTitle}</h2>
              <p style={{fontSize:13,color:C.text3,marginTop:4}}>{t.watchSub}</p>
            </div>
            {watch.length===0?(
              <div style={{...cardBase,padding:40,textAlign:"center",color:C.text3}}>{t.watchEmpty}</div>
            ):(
              <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(260px,1fr))",gap:16}}>
                {stocks.filter(s=>watch.includes(s.symbol)).map(s=>(
                  <div key={s.symbol} className="card" onClick={()=>openModal(s)} style={{...cardBase,padding:20}}>
                    <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:12}}>
                      <div style={{width:40,height:40,borderRadius:10,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.goldD}}>
                        {s.symbol.slice(0,3)}
                      </div>
                      <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}} style={{fontSize:20,color:C.gold}}>★</span>
                    </div>
                    <div style={{fontWeight:700,fontSize:16}}>{s.symbol}</div>
                    <div style={{fontSize:12,color:C.text3,marginBottom:10}}>{s.mkt}</div>
                    <div style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:20,marginBottom:4}}>
                      {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                    </div>
                    <span style={{color:s.pct>=0?C.green:C.red,fontSize:13,fontWeight:600}}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                    <div style={{marginTop:10,background:s.pct>=0?C.greenBg:C.redBg,padding:"6px 10px",borderRadius:8}}>
                      <Spark data={SparkData(s)} pos={s.pct>=0} w={200} h={60}/>
                    </div>
                    <div style={{marginTop:10,fontSize:12,color:C.text3}}>{s.sector}</div>
                    <div style={{fontSize:12,color:C.text3}}>{t.mktCap} {s.cap}</div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* ── ETF ── */}
        {tab==="etf"&&!query&&(
          <div>
            <div style={{marginBottom:20}}>
              <h2 style={{fontFamily:"'Cormorant Garamond',serif",fontSize:26,fontWeight:600}}>{t.etfTitle}</h2>
              <p style={{fontSize:13,color:C.text3,marginTop:4}}>{t.etfSub}</p>
            </div>
            <div style={{display:"grid",gridTemplateColumns:"repeat(auto-fill,minmax(280px,1fr))",gap:16}}>
              {stocks.filter(s=>s.isETF).map(s=>(
                <div key={s.symbol} className="card" onClick={()=>openModal(s)} style={{...cardBase,padding:22}}>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center",marginBottom:12}}>
                    <div style={{display:"flex",alignItems:"center",gap:10}}>
                      <div style={{width:40,height:40,borderRadius:10,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:12,fontWeight:700,color:C.goldD}}>
                        {s.symbol.slice(0,3)}
                      </div>
                      <div>
                        <div style={{fontWeight:700,fontSize:15}}>{s.symbol}</div>
                        <div style={{fontSize:11,color:C.text3}}>{s.region==="ASX"?"🇦🇺 ASX":"🇺🇸 US"}</div>
                      </div>
                    </div>
                    <span className="star" onClick={e=>{e.stopPropagation();toggleWatch(s.symbol);}} style={{fontSize:20,color:watch.includes(s.symbol)?C.gold:C.border2}}>
                      {watch.includes(s.symbol)?"★":"☆"}
                    </span>
                  </div>
                  <div style={{fontSize:13,color:C.text2,marginBottom:12,lineHeight:1.4}}>{s.name}</div>
                  <div style={{display:"flex",justifyContent:"space-between",alignItems:"center"}}>
                    <span style={{fontFamily:"'DM Mono',monospace",fontWeight:700,fontSize:18}}>
                      {s.region==="ASX"?"A$":"$"}{s.price?.toFixed(2)}
                    </span>
                    <span style={chgPill(s.pct)}>{s.pct>=0?"▲":"▼"} {Math.abs(s.pct).toFixed(2)}%</span>
                  </div>
                  <div style={{marginTop:10,fontSize:12,color:C.text3}}>{t.scale} {s.cap}</div>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* ── MODAL ── */}
      {modal&&(
        <div style={{position:"fixed",inset:0,background:"rgba(44,36,22,0.45)",zIndex:200,display:"flex",alignItems:"center",justifyContent:"center",padding:20}} onClick={()=>setModal(null)}>
          <div style={{background:C.card,borderRadius:18,border:`1px solid ${C.border}`,width:"100%",maxWidth:640,maxHeight:"90vh",overflowY:"auto",padding:28,boxShadow:"0 20px 60px rgba(0,0,0,0.18)"}} onClick={e=>e.stopPropagation()}>

            {/* header */}
            <div style={{display:"flex",justifyContent:"space-between",alignItems:"flex-start",marginBottom:20}}>
              <div style={{display:"flex",alignItems:"center",gap:14}}>
                <div style={{width:48,height:48,borderRadius:12,background:C.goldBg,border:`1px solid ${C.border}`,display:"flex",alignItems:"center",justifyContent:"center",fontSize:14,fontWeight:700,color:C.goldD}}>
                  {modal.symbol.slice(0,3)}
                </div>
                <div>
                  <div style={{fontWeight:700,fontSize:20}}>{modal.symbol}</div>
                  <div style={{fontSize:13,color:C.text3}}>{modal.name}</div>
                </div>
              </div>
              <button onClick={()=>setModal(null)} style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,width:34,height:34,cursor:"pointer",fontSize:18,color:C.text3,display:"flex",alignItems:"center",justifyContent:"center"}}>×</button>
            </div>

            {/* price */}
            <div style={{marginBottom:8}}>
              <span style={{fontFamily:"'Cormorant Garamond',serif",fontSize:42,fontWeight:700,letterSpacing:"-1px"}}>
                {modal.region==="ASX"?"A$":"$"}{modal.price?.toFixed(2)}
              </span>
              <span style={{...chgPill(modal.pct),marginLeft:12,fontSize:14}}>
                {modal.pct>=0?"▲":"▼"} {Math.abs(modal.pct).toFixed(2)}%
              </span>
              <span style={{marginLeft:8,fontSize:13,color:modal.change>=0?C.green:C.red,opacity:0.75}}>
                ({modal.change>=0?"+":""}{modal.change?.toFixed(2)})
              </span>
            </div>

            {/* ── 盘前盘后 ── */}
            {(modal.preMarket?.price || modal.postMarket?.price) && (
              <div style={{display:"flex",gap:10,marginBottom:16,flexWrap:"wrap"}}>
                {modal.preMarket?.price && (
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:C.text3}}>{t.preMarket}</span>
                    <span style={{fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{modal.region==="ASX"?"A$":"$"}{modal.preMarket.price.toFixed(2)}</span>
                    {modal.preMarket.pct!=null&&(
                      <span style={{color:modal.preMarket.pct>=0?C.green:C.red,fontWeight:600}}>
                        {modal.preMarket.pct>=0?"+":""}{modal.preMarket.pct}%
                      </span>
                    )}
                  </div>
                )}
                {modal.postMarket?.price && (
                  <div style={{background:C.bg2,border:`1px solid ${C.border}`,borderRadius:8,padding:"5px 12px",fontSize:12,display:"flex",gap:8,alignItems:"center"}}>
                    <span style={{color:C.text3}}>{t.postMarket}</span>
                    <span style={{fontWeight:700,fontFamily:"'DM Mono',monospace"}}>{modal.region==="ASX"?"A$":"$"}{modal.postMarket.price.toFixed(2)}</span>
                    {modal.postMarket.pct!=null&&(
                      <span style={{color:modal.postMarket.pct>=0?C.green:C.red,fontWeight:600}}>
                        {modal.postMarket.pct>=0?"+":""}{modal.postMarket.pct}%
                      </span>
                    )}
                  </div>
                )}
              </div>
            )}

            {/* period selector */}
            <div style={{display:"flex",gap:6,marginBottom:12,flexWrap:"wrap"}}>
              {["today","1wk","1mo","3mo","6mo","1y","2y"].map(p=>(
                <button key={p} className="period-btn" onClick={()=>setHP(p)}
                  style={{padding:"4px 10px",borderRadius:6,fontSize:12,background:histPeriod===p?C.goldBg:"transparent",color:histPeriod===p?C.goldD:C.text3,fontWeight:histPeriod===p?700:400,border:`1px solid ${histPeriod===p?C.border2:C.border}`}}>
                  {p==="today"?t.intraday:p}
                </button>
              ))}
            </div>

            {/* chart */}
            <div style={{borderRadius:10,overflow:"hidden",background:modal.pct>=0?C.greenBg:C.redBg,padding:"10px 12px",marginBottom:20,border:`1px solid ${C.border}`}}>
              {history.length>0
                ?<AreaChart closes={history} pos={modal.pct>=0} h={110}/>
                :<div style={{height:110,display:"flex",alignItems:"center",justifyContent:"center"}}><Skeleton h={110}/></div>
              }
            </div>

            {/* stats */}
            <div style={{display:"grid",gridTemplateColumns:"repeat(3,1fr)",gap:10,marginBottom:20}}>
              {[
                [t.mktCap,  modal.cap],
                [t.vol,     modal.vol],
                [t.pe,      modal.pe??t.na],
                [t.exchange,modal.mkt],
                [t.sector,  modal.sector],
                [t.type,    modal.isETF?t.etfType:t.stockType],
              ].map(([k,v])=>(
                <div key={k} style={{background:C.bg,borderRadius:10,padding:"10px 14px",border:`1px solid ${C.border}`}}>
                  <div style={{fontSize:11,color:C.text3,textTransform:"uppercase",letterSpacing:"0.05em",marginBottom:4}}>{k}</div>
                  <div style={{fontWeight:600,fontSize:14,fontFamily:"'DM Mono',monospace"}}>{v}</div>
                </div>
              ))}
            </div>

            {/* AI */}
            <div style={{background:C.bg,borderRadius:12,padding:16,border:`1px solid ${C.border}`,marginBottom:16}}>
              <div style={{display:"flex",alignItems:"center",gap:8,marginBottom:10}}>
                <div style={{width:26,height:26,borderRadius:6,background:C.text,display:"flex",alignItems:"center",justifyContent:"center",color:"#fff",fontSize:12,fontWeight:700}}>✦</div>
                <span style={{fontWeight:600,fontSize:14}}>{t.aiTitle}</span>
                <span style={{fontSize:11,color:C.text3,background:C.bg2,padding:"2px 8px",borderRadius:10,border:`1px solid ${C.border}`}}>Claude</span>
                {!aiText&&!aiLoad&&(
                  <button className="ai-btn" onClick={()=>runAI(modal)}
                    style={{marginLeft:"auto",background:C.gold,borderRadius:9,padding:"8px 18px",color:"#fff",fontFamily:"inherit",fontSize:13,fontWeight:600}}>
                    {t.aiGenerate}
                  </button>
                )}
              </div>
              {aiLoad&&(
                <div style={{display:"flex",alignItems:"center",gap:8,color:C.text3,fontSize:13}}>
                  <div style={{width:14,height:14,borderRadius:"50%",border:`2px solid ${C.gold}`,borderTopColor:"transparent",animation:"spin 0.8s linear infinite"}}/>
                  {aiMsg}
                </div>
              )}
              {!aiLoad&&!aiText&&<p style={{fontSize:13,color:C.text3,lineHeight:1.6}}>{t.aiHint}</p>}
              {aiText&&(
                <div style={{fontSize:14,lineHeight:1.8,color:C.text,whiteSpace:"pre-wrap"}} className="fu">{aiText}</div>
              )}
            </div>

            {/* actions */}
            <div style={{display:"flex",gap:10}}>
              <button onClick={()=>toggleWatch(modal.symbol)}
                style={{flex:1,background:watch.includes(modal.symbol)?C.goldBg:C.bg,border:`1px solid ${watch.includes(modal.symbol)?C.gold:C.border}`,borderRadius:10,padding:10,color:watch.includes(modal.symbol)?C.goldD:C.text3,fontFamily:"inherit",fontSize:14,fontWeight:600,cursor:"pointer"}}>
                {watch.includes(modal.symbol)?t.inWatch:t.addWatch}
              </button>
              {aiText&&(
                <button onClick={()=>runAI(modal)}
                  style={{flex:1,background:C.bg,border:`1px solid ${C.border}`,borderRadius:10,padding:10,color:C.text3,fontFamily:"inherit",fontSize:14,fontWeight:500,cursor:"pointer"}}>
                  {t.aiRetry}
                </button>
              )}
            </div>

          </div>
        </div>
      )}
    </div>
  );
}
