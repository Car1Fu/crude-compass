/* ══════════════════════════════════════════
   MODULE NEWS ENGINE
══════════════════════════════════════════ */
(()=>{
  const newsRoot=document.getElementById("mnSections");
  if(newsRoot && newsRoot.children.length) return;
  const MODS=[
    {key:"HIGHLIGHT",name:"今日重点"},{key:"Supply",name:"供给政策（OPEC+）"},{key:"Geopolitics",name:"风险事件（地缘）"},
    {key:"Inventory",name:"数据与流向（库存）"},{key:"Freight",name:"航运与物流（运价）"},
    {key:"Spreads",name:"结构与炼化（价差）"},{key:"Macro",name:"美元与利率（宏观）"},{key:"Demand",name:"消费与经济（需求）"},
  ];
  const cl=(x,a,b)=>Math.max(a,Math.min(b,x));
  function gen(){
    const B=[
      {theme:"Geopolitics",title:"红海局势扰动：市场评估通道风险溢价",source:"Reuters",impact:88},
      {theme:"Supply",title:"OPEC+ 配额与执行率：增产路径引发分歧",source:"OPEC",impact:80},
      {theme:"Demand",title:"亚洲需求信号分化：炼厂采购节奏调整",source:"Platts",impact:62},
      {theme:"Macro",title:"美元与实际利率波动：资金面驱动油价联动",source:"Bloomberg",impact:66},
      {theme:"Inventory",title:"EIA/API 库存意外：成品油端变化更关键",source:"EIA",impact:72},
      {theme:"Spreads",title:"裂解价差回落：炼厂利润边际收缩",source:"Argus",impact:55},
      {theme:"Freight",title:"VLCC 运价波动：绕航与保险成本再定价",source:"Energy Intelligence",impact:69},
      {theme:"Geopolitics",title:"制裁消息面升温：交易端关注执行细节",source:"Reuters",impact:64},
      {theme:"Supply",title:"部分成员国产量偏离：市场关注纪律约束",source:"Bloomberg",impact:71},
      {theme:"Inventory",title:"库欣库存变化：WTI 结构性驱动上升",source:"EIA",impact:70},
      {theme:"Spreads",title:"Brent-WTI 价差调整：地区供需与物流影响",source:"Platts",impact:60},
      {theme:"Freight",title:"Aframax 费率坚挺：区域运力短期偏紧",source:"Argus",impact:52},
      {theme:"Macro",title:"通胀数据扰动：市场重新定价降息节奏",source:"Bloomberg",impact:58},
      {theme:"Demand",title:"航煤/汽油需求边际改善：季节性因素升温",source:"Platts",impact:54},
    ];
    const now=Date.now();
    return Array.from({length:180},(_,i)=>{
      const b=B[i%B.length],h=cl(Math.floor(Math.random()*360),0,720);
      const ts=now-h*3600*1000-Math.floor(Math.random()*3600*1000);
      const impact=cl(b.impact+Math.floor((Math.random()*18)-9),1,100);
      return{id:"n"+(20000+i),ts,theme:b.theme,title:b.title+(Math.random()>.7?"（更新）":""),source:b.source,impact,score:impact*.7+Math.max(0,100-h)*.3,summary:""};
    }).sort((a,b)=>b.ts-a.ts);
  }
  let S={q:"",items:[]};
  const THEME_KEY="cc_module_news_theme";
  const getStoredTheme=key=>{
    try{
      const stored=localStorage.getItem(key);
      return stored==="light"||stored==="dark" ? stored : "dark";
    }catch{
      return "dark";
    }
  };
  const $id=id=>document.getElementById(id);
  const p2=n=>String(n).padStart(2,"0");
  const fT=ts=>{const d=new Date(ts);return`${p2(d.getHours())}:${p2(d.getMinutes())}`;};
  const fD=ts=>{const d=new Date(ts);return`${d.getMonth()+1}/${d.getDate()}`;};
  const fHomeD=ts=>{const d=new Date(ts);return`${d.getFullYear()}-${p2(d.getMonth()+1)}-${p2(d.getDate())}`;};
  const esc=s=>String(s).replaceAll("&","&amp;").replaceAll("<","&lt;").replaceAll(">","&gt;").replaceAll('"',"&quot;");
  const impactCls=v=>v>=80?'impact-high':v>=70?'impact-mid':'impact-low';
  const impactSpan=(v,prefix='影响 ')=>`<span class="${impactCls(v)}">${prefix}${v}</span>`;
  const viewEl=$id("view-module-news");
  const themeBtn=$id("mnThemeToggle");
  const HOME_NEWS_THEME_META={
    Geopolitics:{label:"地缘",image:"assets/geo.png"},
    Supply:{label:"供给",image:"assets/supply.png"},
    Inventory:{label:"库存",image:"assets/warehouse.png"},
    Freight:{label:"航运",image:"assets/ship.png"},
    Spreads:{label:"价差/炼化",image:"assets/oil.png"},
    Macro:{label:"宏观",image:"assets/macro.png"},
    Demand:{label:"需求",image:"assets/demand.png"},
  };
  function getHomeNewsThemeMeta(theme){
    return HOME_NEWS_THEME_META[theme] || {label:"资讯",image:"assets/news.png"};
  }
  function updateHomeLatestNews(items){
    const homeFeature=document.querySelector(".news-feature");
    const homeList=document.querySelector(".news-list");
    if(!homeFeature||!homeList)return;
    if(!Array.isArray(items)||!items.length){
      const tagEl=homeFeature.querySelector(".news-feature-tag");
      const sourceEl=homeFeature.querySelector(".news-feature-source");
      const titleEl=homeFeature.querySelector(".news-title");
      const metaTextEl=homeFeature.querySelector(".news-meta span");
      const imageEl=homeFeature.querySelector(".news-feature-image");
      if(tagEl)tagEl.textContent="精选 · 资讯";
      if(sourceEl)sourceEl.textContent="";
      if(titleEl)titleEl.textContent="暂无已导入新闻";
      if(metaTextEl)metaTextEl.textContent="请检查本地新闻数据与后端服务";
      if(imageEl){
        imageEl.src="assets/news.png";
        imageEl.alt="新闻配图";
      }
      homeList.innerHTML=`<div class="news-item"><p class="t">暂无新闻</p><p class="m">请检查新闻 Excel 或本地服务</p></div>`;
      return;
    }
    const leadItem=items[0];
    const sideItems=items.slice(1,5);
    const leadMeta=getHomeNewsThemeMeta(leadItem.theme);
    const tagEl=homeFeature.querySelector(".news-feature-tag");
    const sourceEl=homeFeature.querySelector(".news-feature-source");
    const titleEl=homeFeature.querySelector(".news-title");
    const metaTextEl=homeFeature.querySelector(".news-meta span");
    const imageEl=homeFeature.querySelector(".news-feature-image");
    const moreBtn=homeFeature.querySelector(".news-btn");
    if(tagEl)tagEl.textContent=`精选 · ${leadMeta.label}`;
    if(sourceEl)sourceEl.textContent=leadItem.source||"";
    if(titleEl)titleEl.textContent=leadItem.title||"";
    if(metaTextEl)metaTextEl.textContent=`${fHomeD(leadItem.ts)} · ${leadMeta.label}`;
    if(imageEl){
      imageEl.src=(leadItem.image&&leadItem.image.trim())||leadMeta.image;
      imageEl.alt=`${leadMeta.label}新闻配图`;
    }
    if(moreBtn){
      moreBtn.onclick=()=>{if(typeof switchView==="function")switchView("view-module-news");};
    }
    homeFeature.onclick=()=>{if(typeof switchView==="function")switchView("view-module-news");};
    homeFeature.style.cursor="pointer";
    homeList.innerHTML=sideItems.length?sideItems.map(item=>{
      const meta=getHomeNewsThemeMeta(item.theme);
      return `<div class="news-item" data-id="${item.id}"><p class="t">${esc(item.title)}</p><p class="m">${fHomeD(item.ts)} · ${meta.label}</p></div>`;
    }).join(""):`<div class="news-item"><p class="t">暂无新闻</p><p class="m">请前往新闻资讯查看</p></div>`;
    homeList.querySelectorAll(".news-item").forEach(itemEl=>{
      itemEl.style.cursor="pointer";
      itemEl.addEventListener("click",()=>{if(typeof switchView==="function")switchView("view-module-news");});
    });
  }
  function applyTheme(mode){
    if(!viewEl||!themeBtn) return;
    const isLight=mode==="light";
    viewEl.classList.toggle("mn-light",isLight);
    document.querySelectorAll(".modal-wrap").forEach(el=>el.classList.toggle("mn-light",isLight));
    themeBtn.textContent=isLight?"黑夜模式":"白昼模式";
    themeBtn.setAttribute("aria-pressed",isLight?"true":"false");
  }
  function renderNow(){const el=$id("nowText");if(el){const d=new Date();el.textContent=`本地时间 ${p2(d.getHours())}:${p2(d.getMinutes())}`;}}
  function hl(items){
    const T=["Geopolitics","Supply","Inventory","Macro","Freight","Spreads","Demand"];
    const m=new Map();for(const x of items){if(!m.has(x.theme))m.set(x.theme,[]);m.get(x.theme).push(x);}
    for(const a of m.values())a.sort((a,b)=>b.score-a.score);
    const s=[];for(const t of T){const a=m.get(t);if(a&&a[0])s.push(a[0]);}
    const used=new Set(s.map(x=>x.id));
    const sorted=items.slice().sort((a,b)=>b.score-a.score);
    const out=s.slice();
    for(const x of sorted){if(out.length>=40)break;if(!used.has(x.id)){out.push(x);used.add(x.id);}}
    return out;
  }
  function normalizeNewsItem(item){
    const theme=item&&item.section_key ? String(item.section_key) : "Macro";
    const publishedText=String((item&&item.published_at)||"").trim();
    const parsedTs=Date.parse(publishedText.replace(" ","T"));
    const ts=Number.isFinite(parsedTs)?parsedTs:Date.now();
    const impactRaw=Number(item&&item.impact);
    const impact=Number.isFinite(impactRaw)?impactRaw:50;
    const ageHours=Math.max(0,(Date.now()-ts)/3600000);
    const freshness=Math.max(0,100-Math.min(ageHours,240));
    return{
      id:String((item&&item.id)||`${theme}-${ts}`),
      ts,
      theme,
      title:String((item&&item.title)||""),
      source:String((item&&item.source)||""),
      impact,
      score:impact*.7+freshness*.3,
      summary:"",
      image:getHomeNewsThemeMeta(theme).image,
    };
  }
  async function loadNewsItems(){
    try{
      const response=await fetch("/api/news/list?limit=200",{cache:"no-store"});
      if(!response.ok)throw new Error(`HTTP ${response.status}`);
      const payload=await response.json();
      const items=Array.isArray(payload&&payload.items)?payload.items.map(normalizeNewsItem).filter(item=>item.title):[];
      S.items=items;
    }catch(error){
      console.error("[module-news] failed to load SQLite news feed",error);
      S.items=[];
    }
    render();
    renderQuickNav();
  }
  function modal({title,subtitle,mode,list,det}){
    const w=document.createElement("div");w.className="modal-wrap";
    if(viewEl&&viewEl.classList.contains("mn-light"))w.classList.add("mn-light");
    let body=mode==="list"
      ?`<div class="modal-list">${list.map(x=>`<div class="modal-item" data-id="${x.id}"><p class="tt">${esc(x.title)}</p><div class="mm"><span>${esc(x.source)} · ${fD(x.ts)} ${fT(x.ts)}</span>${impactSpan(x.impact)}</div></div>`).join("")}</div>`
      :`${det.summary?`<div class="modal-text">${esc(det.summary)}</div>`:""}`;
    w.innerHTML=`<div class="modal"><div class="modal-head"><div><div class="t">${esc(title)}</div><div class="s">${esc(subtitle||"")}</div></div><button class="modal-close-btn" id="mC">关闭</button></div><div class="modal-body">${body}</div></div>`;
    document.body.appendChild(w);
    w.addEventListener("click",e=>{if(e.target===w)w.remove();});
    w.querySelector("#mC").addEventListener("click",()=>w.remove());
    if(mode==="list"){w.querySelectorAll(".modal-item").forEach(el=>{el.addEventListener("click",()=>{const item=S.items.find(x=>x.id===el.dataset.id);if(!item)return;w.remove();modal({title:item.title,subtitle:`${item.source} · ${fD(item.ts)} ${fT(item.ts)}`,mode:"detail",det:item});});});}
  }
  function featureImageStyle(item){
    const img=(item&&typeof item.image==="string"?item.image.trim():"");
    return img?` style="background-image:url('${esc(img).replace(/'/g,"%27")}')"`:"";
  }
  function featureCard(item){
    const html=fc(item);
    return item&&item.image?html.replace('<div class="f-img">',`<div class="f-img"${featureImageStyle(item)}>`):html;
  }
  function fc(item){
    if(!item)return`<div class="mn-feature" data-theme="Geopolitics"><div class="f-img"><div class="f-badge"><span class="f-dot"></span>暂无结果</div><div class="f-overlay"><div class="f-title">当前搜索下无匹配</div></div></div></div>`;
    return`<div class="mn-feature" data-id="${item.id}" data-theme="${item.theme}"><div class="f-img"><div class="f-badge"><span class="f-dot"></span>今日重点 · ${impactSpan(item.impact)}</div><div class="f-overlay"><div class="f-kicker">${esc(item.source)}</div><div class="f-title">${esc(item.title)}</div><div class="f-meta"><span>${fD(item.ts)} ${fT(item.ts)}</span><span>点击阅读</span></div></div></div></div>`;
  }
  function renderFeatureSection(sectionKey, sectionName, items, moreLabel){
    const top=items[0]||null;
    const side=items.slice(1,6);
    const sideRows=side.map(x=>`<div class="hl-item" data-id="${x.id}"><div class="hl-src">${esc(x.source)}</div><p class="hl-title">${esc(x.title)}</p><div class="hl-meta"><span>${fD(x.ts)} ${fT(x.ts)}</span>${impactSpan(x.impact)}</div></div>`).join("")||`<div class="hl-item"><p class="hl-title" style="color:var(--mn-empty-text)">（暂无）</p></div>`;
    return`<div class="mn-section" id="sec-${sectionKey}"><div class="mn-section-head"><h3>${esc(sectionName)}</h3><div class="mn-section-meta"><button class="mn-btn primary" data-vm data-key="${sectionKey}" style="padding:4px 10px;font-size:11px;border-radius:8px;">${moreLabel}</button></div></div><div class="mn-body mn-body-hl">${fc(top)}<div class="mn-panel">${sideRows}</div></div></div>`;
  }
  renderFeatureSection=function(sectionKey, sectionName, items, moreLabel){
    const top=items[0]||null;
    const side=items.slice(1,6);
    const sideRows=side.map(x=>`<div class="hl-item" data-id="${x.id}"><div class="hl-src">${esc(x.source)}</div><p class="hl-title">${esc(x.title)}</p><div class="hl-meta"><span>${fD(x.ts)} ${fT(x.ts)}</span>${impactSpan(x.impact)}</div></div>`).join("")||`<div class="hl-item"><p class="hl-title" style="color:var(--mn-empty-text)">锛堟殏鏃狅級</p></div>`;
    return`<div class="mn-section" id="sec-${sectionKey}"><div class="mn-section-head"><h3>${esc(sectionName)}</h3><div class="mn-section-meta"><button class="mn-btn primary" data-vm data-key="${sectionKey}" style="padding:4px 10px;font-size:11px;border-radius:8px;">${moreLabel}</button></div></div><div class="mn-body mn-body-hl">${featureCard(top)}<div class="mn-panel">${sideRows}</div></div></div>`;
  }
  function renderQuickNav(){
    const nav=document.getElementById("mnQuickNav");if(!nav)return;
    nav.innerHTML=MODS.map(m=>`<button class="mn-qnav-btn" data-navkey="${m.key}" onclick="document.getElementById('sec-${m.key}').scrollIntoView({behavior:'smooth',block:'nearest'})">${m.name}</button>`).join("");
    if(nav.querySelectorAll(".mn-qnav-btn")[0])nav.querySelectorAll(".mn-qnav-btn")[0].classList.add("active");
    const obs=new IntersectionObserver(entries=>{entries.forEach(e=>{if(e.isIntersecting){const key=e.target.id.replace("sec-","");nav.querySelectorAll(".mn-qnav-btn").forEach(b=>b.classList.toggle("active",b.dataset.navkey===key));}});},{threshold:0.25,root:null});
    MODS.forEach(m=>{const el=document.getElementById("sec-"+m.key);if(el)obs.observe(el);});
  }
  function render(){
    const filtered=S.items.filter(x=>!S.q||(x.title+" "+x.source+" "+x.summary).toLowerCase().includes(S.q.trim().toLowerCase()));
    const cEl=document.getElementById("resultCount");if(cEl)cEl.textContent=`${filtered.length} 条`;
    const H=hl(filtered),hlTop=H[0]||null,hlSide=H.slice(1,14);
    updateHomeLatestNews(H);
    const sec=document.getElementById("mnSections");if(!sec)return;
    sec.innerHTML=MODS.map(m=>{
      const list=m.key==="HIGHLIGHT" ? H : filtered.filter(x=>x.theme===m.key).sort((a,b)=>b.score-a.score);
      return renderFeatureSection(m.key,m.name,list,"更多");
    }).join("");
    sec.querySelectorAll("[data-id]").forEach(el=>el.addEventListener("click",()=>{const item=S.items.find(x=>x.id===el.dataset.id);if(!item)return;modal({title:item.title,subtitle:`${item.source} · ${fD(item.ts)} ${fT(item.ts)}`,mode:"detail",det:item});}));
    sec.querySelectorAll("[data-vm]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const key=btn.dataset.key;let list=[],title="";if(key==="HIGHLIGHT"){list=H;title="今日重点 · 更多新闻";}else{const mod=MODS.find(x=>x.key===key);list=filtered.filter(x=>x.theme===key).sort((a,b)=>b.score-a.score);title=`${mod?.name||key} · 更多新闻`;}modal({title,subtitle:`共 ${list.length} 条`,mode:"list",list});}));
    return;
    sec.innerHTML=MODS.map(m=>{
      if(m.key==="HIGHLIGHT"){
        const sideRows=hlSide.map(x=>`<div class="hl-item" data-id="${x.id}"><div class="hl-src">${esc(x.source)}</div><p class="hl-title">${esc(x.title)}</p><div class="hl-meta"><span>${fD(x.ts)} ${fT(x.ts)}</span>${impactSpan(x.impact)}</div></div>`).join("")||`<div class="hl-item"><p class="hl-title" style="color:var(--mn-empty-text)">（暂无）</p></div>`;
        return`<div class="mn-section" id="sec-HIGHLIGHT"><div class="mn-section-head"><h3>${esc(m.name)}</h3><div class="mn-section-meta"><button class="mn-btn primary" data-vm data-key="HIGHLIGHT" style="padding:4px 10px;font-size:11px;border-radius:8px;">更多</button></div></div><div class="mn-body mn-body-hl">${fc(hlTop)}<div class="mn-panel">${sideRows}</div></div></div>`;
      }
      const la=filtered.filter(x=>x.theme===m.key).sort((a,b)=>b.score-a.score);
      const rows=la.map(x=>`<div class="mn-news-row" data-id="${x.id}"><div class="nr-src">${esc(x.source)}</div><div class="nr-title">${esc(x.title)}</div><div class="nr-meta"><span>${fD(x.ts)} ${fT(x.ts)}</span>${impactSpan(x.impact)}</div></div>`).join("")||`<div class="mn-news-row"><div class="nr-title" style="color:var(--mn-empty-text)">当前搜索下暂无</div></div>`;
      return`<div class="mn-section" id="sec-${m.key}"><div class="mn-section-head"><h3>${esc(m.name)}</h3><div class="mn-section-meta"><button class="mn-btn primary" data-vm data-key="${m.key}" style="padding:4px 10px;font-size:11px;border-radius:8px;">更多</button></div></div><div class="mn-body"><div class="mn-news-list">${rows}</div></div></div>`;
    }).join("");
    sec.querySelectorAll("[data-id]").forEach(el=>el.addEventListener("click",()=>{const item=S.items.find(x=>x.id===el.dataset.id);if(!item)return;modal({title:item.title,subtitle:`${item.source} · ${fD(item.ts)} ${fT(item.ts)}`,mode:"detail",det:item});}));
    sec.querySelectorAll("[data-vm]").forEach(btn=>btn.addEventListener("click",e=>{e.stopPropagation();const key=btn.dataset.key;let list=[],title="";if(key==="HIGHLIGHT"){list=H;title="今日重点 · 更多新闻";}else{const mod=MODS.find(x=>x.key===key);list=filtered.filter(x=>x.theme===key).sort((a,b)=>b.score-a.score);title=`${mod?.name||key} · 更多新闻`;}modal({title,subtitle:`共 ${list.length} 条`,mode:"list",list});}));
  }
  renderNow();setInterval(renderNow,20000);
  const qEl=document.getElementById("mnQ");if(qEl)qEl.addEventListener("input",()=>{S.q=qEl.value;render();});
  const clr=document.getElementById("mnClear");if(clr)clr.addEventListener("click",()=>{if(qEl)qEl.value="";S.q="";render();});
  applyTheme(getStoredTheme(THEME_KEY));
  if(themeBtn)themeBtn.addEventListener("click",()=>{
    const next=viewEl&&viewEl.classList.contains("mn-light")?"dark":"light";
    localStorage.setItem(THEME_KEY,next);
    applyTheme(next);
  });
  render();
  renderQuickNav();
  loadNewsItems();
})();

/* ══════════════════════════════════════════
   RESEARCH PLATFORM ENGINE
══════════════════════════════════════════ */
(()=>{
  const RP_TAGS=["供给","需求","宏观","库存","运价","价差","地缘冲突","航运","政策","炼化","OPEC","EIA"];
  const RP_INSTS=["中信期货","国泰君安","中金公司","申万宏源","东证期货","华泰证券","海通证券","广发期货","南华期货","光大期货","永安期货","银河期货","中泰证券","方正中期期货","招商证券","浙商期货","国投安信期货","国信证券","兴业证券","民生证券","国联证券","OPEC","EIA"];
  const RP_TYPES=["周报","月报","点评","策略","数据"];
  const RP_TPLS=["地缘扰动与供需再平衡：关注库存路径与风险溢价（{type}）","Brent/WTI 曲线结构与期限价差：{tag1}与{tag2}的交易含义（{type}）","OPEC/EIA 更新速览：{tag1}变化与{tag2}信号（{type}）","宏观预期波动下的油市：{tag1}约束与{tag2}弹性（{type}）","航运与运价跟踪：运力与绕行对油价传导（{type}）","炼化开工与裂解价差：{tag1}对需求边际的指引（{type}）"];
  function rpRand(s){let t=s+0x6D2B79F5;t=Math.imul(t^(t>>>15),t|1);t^=t+Math.imul(t^(t>>>7),t|61);return((t^(t>>>14))>>>0)/4294967296;}
  function rpPad(n){return String(n).padStart(2,"0");}
  function rpToISO(d){return`${d.getFullYear()}-${rpPad(d.getMonth()+1)}-${rpPad(d.getDate())}`;}
  function rpParseDate(ts){const[d,hm]=ts.split(" ");const[y,m,dd]=d.split("-").map(Number);const[hh,mm]=(hm||"00:00").split(":").map(Number);return new Date(y,m-1,dd,hh,mm,0);}
  function rpEsc(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[c]));}
  function rpHL(text,q){const safe=rpEsc(text);if(!q)return safe;const re=new RegExp(q.replace(/[.*+?^${}()|[\]\\]/g,"\\$&"),"ig");return safe.replace(re,m=>`<span class="rp-hl">${m}</span>`);}
  function rpHotCls(v){return v>=80?"rp-hot-high":v>=70?"rp-hot-mid":"rp-hot-low";}
  const RP_REPORTS=(()=>{const out=[];const base=20260301;const anchor=new Date("2026-01-15T23:59:00");for(let i=0;i<800;i++){const dayOffset=Math.floor(rpRand(base+i*17)*380);const stamp=new Date(anchor);stamp.setDate(anchor.getDate()-dayOffset);const hh=Math.floor(rpRand(base+i*7)*24),mm=Math.floor(rpRand(base+i*11)*60);stamp.setHours(hh,mm,0,0);const year=stamp.getFullYear(),month=stamp.getMonth()+1,day=stamp.getDate();const inst=RP_INSTS[Math.floor(rpRand(base+i*13)*RP_INSTS.length)];const type=RP_TYPES[Math.floor(rpRand(base+i*19)*RP_TYPES.length)];const tag1=RP_TAGS[Math.floor(rpRand(base+i*23)*RP_TAGS.length)];const tag2=RP_TAGS[Math.floor(rpRand(base+i*31)*RP_TAGS.length)];const tag3=RP_TAGS[Math.floor(rpRand(base+i*37)*RP_TAGS.length)];const tpl=RP_TPLS[Math.floor(rpRand(base+i*41)*RP_TPLS.length)];const title=tpl.replace("{type}",type).replace("{tag1}",tag1).replace("{tag2}",tag2);const pages=6+Math.floor(rpRand(base+i*47)*90);const hot=10+Math.floor(rpRand(base+i*53)*90);const pool=["研究组","策略团队","能源组","张博","孙伟东","杨晓宇","陈子昂","李某","王某"];const a1=pool[Math.floor(rpRand(base+i*59)*pool.length)];const a2=pool[Math.floor(rpRand(base+i*61)*pool.length)];const tags=Array.from(new Set([tag1,tag2,tag3])).slice(0,3);out.push({id:"r"+(i+1),time:`${year}-${rpPad(month)}-${rpPad(day)} ${rpPad(hh)}:${rpPad(mm)}`,inst,title,type,pages,hot,tags,authors:a1===a2?[a1]:[a1,a2],summary:`本报告聚焦「${tags.join("、")}」主线（样例文本）。`,bullets:[`关注 ${tags[0]||"核心变量"} 的边际变化。`,`跟踪 ${tags[1]||"二级变量"} 与宏观共振。`,"结构上以区间/事件驱动为主（样例）。"]});}return out;})();
  const LS_FAV="cc_fav_v5",LS_READ="cc_read_v5";
  const rpFav=new Set(JSON.parse(localStorage.getItem(LS_FAV)||"[]"));
  const rpRead=new Set(JSON.parse(localStorage.getItem(LS_READ)||"[]"));
  const rpState={q:"",sort:"new",type:"",tags:new Set(),from:"",to:"",onlyUnread:false,showFav:false,selected:new Set(),page:1,pageSize:20};
  const RP_THEME_KEY="cc_research_theme";
  const readStoredResearchTheme=()=>{
    try{
      const stored=localStorage.getItem(RP_THEME_KEY);
      return stored==="light"||stored==="dark" ? stored : "dark";
    }catch{
      return "dark";
    }
  };
  const rpViewEl=document.getElementById("view-research");
  const rpThemeBtn=document.getElementById("rpThemeToggle");
  if(typeof window.rpRenderAllGlobal === "function") return;
  function rpApplyTheme(mode){
    if(!rpViewEl||!rpThemeBtn)return;
    const isLight=mode==="light";
    rpViewEl.classList.toggle("rp-light",isLight);
    rpThemeBtn.textContent=isLight?"黑夜模式":"白昼模式";
    rpThemeBtn.setAttribute("aria-pressed",isLight?"true":"false");
  }
  const rpTodayStr=rpToISO(new Date());
  const rpFromEl=document.getElementById("rpFrom"),rpToEl=document.getElementById("rpTo");
  const rpFromDisp=document.getElementById("rpFromDisp"),rpToDisp=document.getElementById("rpToDisp");
  function rpRefreshDateDisp(){rpFromDisp.textContent=rpFromEl.value||rpTodayStr;rpFromDisp.classList.toggle("rp-faint",!rpFromEl.value);rpToDisp.textContent=rpToEl.value||rpTodayStr;rpToDisp.classList.toggle("rp-faint",!rpToEl.value);}
  function rpAttachPicker(box,input){const open=()=>{input.focus({preventScroll:true});if(typeof input.showPicker==="function")input.showPicker();};box.addEventListener("click",open);input.addEventListener("mousedown",e=>{e.preventDefault();open();});}
  rpAttachPicker(document.getElementById("rpFromBox"),rpFromEl);
  rpAttachPicker(document.getElementById("rpToBox"),rpToEl);
  function rpFiltered(){let arr=RP_REPORTS.slice();if(rpState.showFav)arr=arr.filter(r=>rpFav.has(r.id));if(rpState.onlyUnread)arr=arr.filter(r=>!rpRead.has(r.id));if(rpState.type)arr=arr.filter(r=>r.type===rpState.type);if(rpState.tags.size)arr=arr.filter(r=>{const s=new Set(r.tags);for(const t of rpState.tags)if(!s.has(t))return false;return true;});if(rpState.q){const q=rpState.q.toLowerCase();arr=arr.filter(r=>r.title.toLowerCase().includes(q)||r.inst.toLowerCase().includes(q)||r.authors.join(",").toLowerCase().includes(q)||r.tags.join(",").toLowerCase().includes(q));}if(rpState.from||rpState.to){arr=arr.filter(r=>{const d=rpParseDate(r.time);if(rpState.from&&d<new Date(rpState.from+"T00:00:00"))return false;if(rpState.to&&d>new Date(rpState.to+"T23:59:59"))return false;return true;});}if(rpState.sort==="new")arr.sort((a,b)=>rpParseDate(b.time)-rpParseDate(a.time));if(rpState.sort==="hot")arr.sort((a,b)=>b.hot-a.hot);if(rpState.sort==="pages")arr.sort((a,b)=>b.pages-a.pages);return arr;}
  function rpPageCount(n){return Math.max(1,Math.ceil(n/rpState.pageSize));}
  function rpRenderTagChips(){const box=document.getElementById("rpTagChips");box.innerHTML="";RP_TAGS.forEach(tag=>{const el=document.createElement("div");el.className="rp-chip"+(rpState.tags.has(tag)?" active":"");el.textContent=tag;el.onclick=()=>{rpState.tags.has(tag)?rpState.tags.delete(tag):rpState.tags.add(tag);rpState.page=1;rpRenderAll();};box.appendChild(el);});}
  function rpRenderPills(){const el=document.getElementById("rpPills");const pills=[];if(rpState.q)pills.push({k:"q",v:`搜索：${rpState.q}`});if(rpState.type)pills.push({k:"type",v:`类型：${rpState.type}`});if(rpState.tags.size)pills.push({k:"tags",v:`标签：${[...rpState.tags].join("、")}`});if(rpState.from||rpState.to)pills.push({k:"date",v:`日期：${rpState.from||"…"} ~ ${rpState.to||"…"}`});if(rpState.onlyUnread)pills.push({k:"unread",v:"仅看未读"});if(rpState.showFav)pills.push({k:"fav",v:"仅看收藏"});if(!pills.length){el.innerHTML=`<span class="rp-muted">当前筛选：无</span>`;return;}el.innerHTML=pills.map(p=>`<div class="rp-pill"><span>${rpEsc(p.v)}</span><span class="x" data-k="${p.k}">×</span></div>`).join("");el.querySelectorAll(".x").forEach(x=>x.addEventListener("click",()=>{const k=x.getAttribute("data-k");if(k==="q")rpState.q="";if(k==="type")rpState.type="";if(k==="tags")rpState.tags.clear();if(k==="date"){rpState.from="";rpState.to="";rpFromEl.value="";rpToEl.value="";rpRefreshDateDisp();}if(k==="unread")rpState.onlyUnread=false;if(k==="fav")rpState.showFav=false;rpState.page=1;rpRenderAll();}));}
  function rpDlIcon(){return`<svg viewBox="0 0 24 24" fill="none"><path d="M12 3v10" stroke="currentColor" stroke-width="2" stroke-linecap="round"/><path d="M7 11l5 5 5-5" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/><path d="M5 20h14" stroke="currentColor" stroke-width="2" stroke-linecap="round"/></svg>`;}
  function rpStarIcon(f){return f?`<svg viewBox="0 0 24 24" fill="currentColor"><path d="M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03L12 17.3z"/></svg>`:`<svg viewBox="0 0 24 24" fill="none"><path d="M12 17.3l-6.18 3.7 1.64-7.03L2 9.24l7.19-.61L12 2l2.81 6.63 7.19.61-5.46 4.73 1.64 7.03L12 17.3z" stroke="currentColor" stroke-width="2" stroke-linejoin="round"/></svg>`;}
  function rpDlBlob(blob,name){const u=URL.createObjectURL(blob);const a=document.createElement("a");a.href=u;a.download=name;document.body.appendChild(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(u),1000);}
  function rpBuildPDF(reports,hint="研报"){if(!window.jspdf){alert("PDF 库尚未加载。");return null;}const{jsPDF}=window.jspdf;const doc=new jsPDF({unit:"pt",format:"a4"});const mg=48,w=doc.internal.pageSize.getWidth(),lw=w-mg*2,now=new Date();function hdr(){doc.setFont("helvetica","bold");doc.setFontSize(16);doc.text("研究报告（Demo）",mg,70);doc.setDrawColor(200,162,74);doc.setLineWidth(1);doc.line(mg,82,w-mg,82);doc.setFont("helvetica","normal");doc.setFontSize(10);doc.setTextColor(120);doc.text(`Generated by Crude Compass · ${now.toISOString().slice(0,19).replace("T"," ")}`,mg,98);doc.setTextColor(0);}function addRep(rep,idx){if(idx>0)doc.addPage();hdr();let y=130;doc.setFont("helvetica","bold");doc.setFontSize(14);doc.text(rep.title,mg,y,{maxWidth:lw});y+=26;doc.setFont("helvetica","normal");doc.setFontSize(11);doc.setTextColor(60);doc.text(`机构：${rep.inst}  时间：${rep.time}  类型：${rep.type}  页数：${rep.pages}p`,mg,y,{maxWidth:lw});y+=22;doc.setTextColor(0);doc.setFont("helvetica","bold");doc.setFontSize(12);doc.text("摘要",mg,y);y+=16;doc.setFont("helvetica","normal");doc.setFontSize(11);const sl=doc.splitTextToSize(rep.summary,lw);doc.text(sl,mg,y);y+=sl.length*14+14;doc.setFont("helvetica","bold");doc.text("核心观点",mg,y);y+=16;doc.setFont("helvetica","normal");rep.bullets.forEach(b=>{const bl=doc.splitTextToSize("• "+b,lw);if(y+bl.length*14>780){doc.addPage();y=80;}doc.text(bl,mg,y);y+=bl.length*14+6;});}(Array.isArray(reports)?reports:[reports]).forEach((r,i)=>addRep(r,i));return{blob:doc.output("blob"),fileName:`${hint}_${now.toISOString().slice(0,10)}.pdf`};}
  function rpDownload(rep){rpRead.add(rep.id);localStorage.setItem(LS_READ,JSON.stringify([...rpRead]));const res=rpBuildPDF(rep,"研报_"+rep.inst.slice(0,12));if(res)rpDlBlob(res.blob,res.fileName);rpRenderAll(false);}
  function rpRenderPager(total){const tp=rpPageCount(total);if(rpState.page>tp)rpState.page=tp;document.getElementById("rpPageInfo").textContent=`共 ${total} 条 · 第 ${rpState.page} / ${tp} 页`;const box=document.getElementById("rpPageBtns");box.innerHTML="";const mk=(label,page,cls="rp-page-btn")=>{const b=document.createElement("button");b.className=cls;b.textContent=label;b.onclick=()=>{rpState.page=page;rpRenderAll(false);};return b;};box.appendChild(mk("上一页",Math.max(1,rpState.page-1)));const s=Math.max(1,rpState.page-2),e=Math.min(tp,rpState.page+2);if(s>1)box.appendChild(mk("1",1));if(s>2){const el=document.createElement("span");el.className="rp-muted";el.textContent="…";box.appendChild(el);}for(let p=s;p<=e;p++)box.appendChild(mk(String(p),p,"rp-page-btn"+(p===rpState.page?" active":"")));if(e<tp-1){const el=document.createElement("span");el.className="rp-muted";el.textContent="…";box.appendChild(el);}if(e<tp)box.appendChild(mk(String(tp),tp));box.appendChild(mk("下一页",Math.min(tp,rpState.page+1)));}
  function rpSyncSel(){const bar=document.getElementById("rpSelBar"),n=rpState.selected.size;document.getElementById("rpSelInfo").textContent=`已选 ${n} 篇`;n>0?bar.classList.add("show"):bar.classList.remove("show");}
  function rpRenderTable(){const all=rpFiltered(),start=(rpState.page-1)*rpState.pageSize;const rows=all.slice(start,start+rpState.pageSize);const tbody=document.getElementById("rpTbody");tbody.innerHTML=rows.map(r=>{const tags=r.tags.map(t=>`<span class="rp-tag">${rpEsc(t)}</span>`).join("");return`<tr data-id="${r.id}"><td><input class="rp-checkbox rp-row-check" type="checkbox" ${rpState.selected.has(r.id)?"checked":""}/></td><td><div>${rpEsc(r.time.slice(5))}</div><div class="rp-muted">${rpRead.has(r.id)?"已读":"未读"} · ${rpFav.has(r.id)?"已收藏":"—"}</div></td><td><div>${rpEsc(r.inst)}</div><div class="rp-muted">${rpEsc(r.authors[0]||"")}${r.authors.length>1?" 等":""}</div></td><td class="rp-title-cell"><div class="tt">${rpHL(r.title,rpState.q)}</div><div>${tags}</div><div class="rp-row-actions"><button class="rp-action-btn rp-act-dl">${rpDlIcon()}<span>下载</span></button><button class="rp-action-btn rp-star rp-act-fav">${rpStarIcon(rpFav.has(r.id))}<span>${rpFav.has(r.id)?"已收藏":"收藏"}</span></button></div></td><td>${rpEsc(r.type)}</td><td>${r.pages}</td><td><div class="${rpHotCls(r.hot)}">${r.hot}</div><div class="rp-muted">热度</div></td></tr>`;}).join("");tbody.querySelectorAll("tr").forEach(tr=>{const id=tr.getAttribute("data-id"),rep=RP_REPORTS.find(x=>x.id===id);tr.querySelector(".rp-row-check").addEventListener("change",e=>{e.target.checked?rpState.selected.add(id):rpState.selected.delete(id);rpSyncSel();});tr.querySelector(".rp-act-dl").addEventListener("click",()=>rpDownload(rep));tr.querySelector(".rp-act-fav").addEventListener("click",()=>{rpFav.has(rep.id)?rpFav.delete(rep.id):rpFav.add(rep.id);localStorage.setItem(LS_FAV,JSON.stringify([...rpFav]));rpRenderAll(false);});});const ca=document.getElementById("rpCheckAll"),pids=rows.map(r=>r.id),allSel=pids.length>0&&pids.every(id=>rpState.selected.has(id));ca.checked=allSel;ca.indeterminate=!allSel&&pids.some(id=>rpState.selected.has(id));ca.onchange=()=>{pids.forEach(id=>ca.checked?rpState.selected.add(id):rpState.selected.delete(id));rpSyncSel();rpRenderAll(false);};rpRenderPager(all.length);}
  function rpRenderAll(resetSel=true){if(resetSel){rpState.selected.clear();rpSyncSel();}rpRefreshDateDisp();rpRenderTagChips();rpRenderPills();rpRenderTable();}
  document.getElementById("rpQ").addEventListener("input",e=>{rpState.q=e.target.value.trim();rpState.page=1;rpRenderAll();});
  document.getElementById("rpSort").addEventListener("change",e=>{rpState.sort=e.target.value;rpState.page=1;rpRenderAll();});
  document.getElementById("rpType").addEventListener("change",e=>{rpState.type=e.target.value;rpState.page=1;rpRenderAll();});
  document.getElementById("rpUnread").onclick=()=>{rpState.onlyUnread=!rpState.onlyUnread;rpState.page=1;rpRenderAll();};
  document.getElementById("rpFavBtn").onclick=()=>{rpState.showFav=!rpState.showFav;rpState.page=1;rpRenderAll();};
  document.getElementById("rpClearAll").onclick=()=>{rpState.q="";rpState.type="";rpState.tags.clear();rpState.from="";rpState.to="";rpState.onlyUnread=false;rpState.showFav=false;rpState.page=1;rpFromEl.value="";rpToEl.value="";rpRenderAll();};
  document.getElementById("rpExport").onclick=()=>{const rows=rpFiltered();const head=["time","inst","title","type","pages","hot","tags"];const lines=[head.join(","),...rows.map(r=>[r.time,r.inst,`"${r.title.replaceAll('"','""')}"`,r.type,r.pages,r.hot,r.tags.join("|")].join(","))];rpDlBlob(new Blob([lines.join("\n")],{type:"text/csv;charset=utf-8"}),`研报清单_${rpToISO(new Date())}.csv`);};
  rpFromEl.addEventListener("change",e=>{rpState.from=e.target.value;rpState.page=1;rpRefreshDateDisp();rpRenderAll();});
  rpToEl.addEventListener("change",e=>{rpState.to=e.target.value;rpState.page=1;rpRefreshDateDisp();rpRenderAll();});
  const rpSetRange=(f,t)=>{rpState.from=rpFromEl.value=f;rpState.to=rpToEl.value=t;rpState.page=1;rpRenderAll();};
  document.getElementById("rpQ7").onclick=()=>{const n=new Date(),f=new Date(n);f.setDate(n.getDate()-6);rpSetRange(rpToISO(f),rpToISO(n));};
  document.getElementById("rpQ30").onclick=()=>{const n=new Date(),f=new Date(n);f.setDate(n.getDate()-29);rpSetRange(rpToISO(f),rpToISO(n));};
  document.getElementById("rpQY").onclick=()=>{const n=new Date();rpSetRange(`${n.getFullYear()}-01-01`,rpToISO(n));};
  document.getElementById("rpQAll").onclick=()=>{rpState.from=rpState.to="";rpFromEl.value=rpToEl.value="";rpState.page=1;rpRenderAll();};
  document.getElementById("rpBulkFav").onclick=()=>{rpState.selected.forEach(id=>rpFav.add(id));localStorage.setItem(LS_FAV,JSON.stringify([...rpFav]));rpRenderAll(false);};
  document.getElementById("rpBulkDl").onclick=()=>{const reps=[...rpState.selected].map(id=>RP_REPORTS.find(r=>r.id===id)).filter(Boolean);reps.forEach((r,i)=>setTimeout(()=>rpDownload(r),i*350));};
  document.getElementById("rpBulkMerge").onclick=()=>{const reps=[...rpState.selected].map(id=>RP_REPORTS.find(r=>r.id===id)).filter(Boolean);if(!reps.length)return;const res=rpBuildPDF(reps,"今日研报包");if(res)rpDlBlob(res.blob,res.fileName);reps.forEach(r=>rpRead.add(r.id));localStorage.setItem(LS_READ,JSON.stringify([...rpRead]));rpRenderAll(false);};
  document.getElementById("rpBulkClear").onclick=()=>{rpState.selected.clear();rpSyncSel();rpRenderAll(false);};
  document.getElementById("rpGoPage").onclick=()=>{const v=Number(document.getElementById("rpJumpInput").value),tp=rpPageCount(rpFiltered().length);if(!v||v<1||v>tp)return;rpState.page=v;rpRenderAll(false);};
  rpApplyTheme(readStoredResearchTheme());
  if(rpThemeBtn)rpThemeBtn.addEventListener("click",()=>{const next=rpViewEl&&rpViewEl.classList.contains("rp-light")?"dark":"light";localStorage.setItem(RP_THEME_KEY,next);rpApplyTheme(next);});
  window.rpRenderAllGlobal = rpRenderAll;
})();

/* ══════════════════════════════════════════════════════
   FORECAST CENTER ENGINE
══════════════════════════════════════════════════════ */
window.fcInited = window.fcInited || false;
window.initForecastOnce = function(){
  if(window.fcInited) return;
  window.fcInited = true;
  initForecast();
};

function initForecast(){
  const $ = id => document.getElementById(id);
  const root = $("view-forecast");
  const themeBtn = $("fcThemeBtn");
  const FC_THEME_KEY = "cc_forecast_theme";
  const readStoredTheme=()=>{
    try{
      const stored=localStorage.getItem(FC_THEME_KEY);
      return stored==="light"||stored==="dark" ? stored : "dark";
    }catch{
      return "dark";
    }
  };
  const money = x => "$" + x.toFixed(2);
  const pct = x => (x*100).toFixed(1) + "%";
  const clamp = (x,a,b) => Math.max(a,Math.min(b,x));
  function seededNoise(i,seed=7){const t=Math.sin((i+1)*12.9898+seed*78.233)*43758.5453;return(t-Math.floor(t))-.5;}
  function erf(x){const sign=x>=0?1:-1;x=Math.abs(x);const a1=.254829592,a2=-.284496736,a3=1.421413741,a4=-1.453152027,a5=1.061405429,p=.3275911;const t=1/(1+p*x);const y=1-((((a5*t+a4)*t+a3)*t+a2)*t+a1)*t*Math.exp(-x*x);return sign*y;}
  function normCdf(z){return .5*(1+erf(z/Math.SQRT2));}
  function pad2(n){return String(n).padStart(2,"0");}
  function fmtDate(d){return`${d.getFullYear()}-${pad2(d.getMonth()+1)}-${pad2(d.getDate())}`;}
  function addDays(d,n){const r=new Date(d);r.setDate(r.getDate()+n);return r;}
  function buildDates(nH,nF){const end=new Date();end.setHours(0,0,0,0);return Array.from({length:nH},(_,i)=>addDays(end,-(nH-1-i))).concat(Array.from({length:nF},(_,i)=>addDays(end,i+1)));}
  function toast(msg){const el=$("fc-toast");el.textContent=msg;el.classList.add("show");clearTimeout(toast._t);toast._t=setTimeout(()=>el.classList.remove("show"),1200);}
  function svgEl(tag,attrs={}){const el=document.createElementNS("http://www.w3.org/2000/svg",tag);Object.entries(attrs).forEach(([k,v])=>el.setAttribute(k,v));return el;}
  function pathD(xs,ys){return xs.map((x,i)=>(i===0?"M":"L")+x.toFixed(2)+" "+ys[i].toFixed(2)).join(" ");}
  function fcIsLight(){return !!(root&&root.classList.contains("fc-light"));}
  function applyForecastTheme(mode){
    const isLight=mode==="light";
    if(root) root.classList.toggle("fc-light",isLight);
    if(themeBtn){
      const label=themeBtn.querySelector("span");
      if(label) label.textContent=isLight?"黑夜模式":"白昼模式";
      themeBtn.setAttribute("aria-pressed",isLight?"true":"false");
    }
  }
  const forecastApiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href) ? window.location.origin : "http://127.0.0.1:8008");
  const forecastHistoryLimit = 300;
  const realHistoryCache = new Map();
  const realHistoryLoads = new Map();

  const state = {
    asset:"wti", horizon:1, model:"ap",
    histLen:360, viewCount:120, viewStart:0,
    factors:{opec:0,inventory:0,usd:0,geo:0,shipping:0,demand:0}
  };
  const getForecastAssetLabel = () => state.asset==="brent" ? "Brent" : "WTI";
  const getForecastModelLabel = () => (
    state.model==="ap" ? "A+P（Aurora 与 Protots）" :
    state.model==="stacking" ? "Stacking" :
    state.model==="lstm" ? "LSTM" :
    state.model==="prophet" ? "Prophet" :
    state.model==="arima" ? "ARIMA" : String(state.model).toUpperCase()
  );

  /* ── Data ── */
  function parseMarketDate(value){
    const parsed=new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
  }

  function buildFutureDatesFrom(lastDate,nF){
    return Array.from({length:nF},(_,i)=>addDays(lastDate,i+1));
  }

  function getRealHistorySymbol(){
    return state.asset==="brent" ? "Brent" : "WTI";
  }

  function normalizeRealHistoryRows(rows){
    return (Array.isArray(rows)?rows:[])
      .map(row=>({
        tradeDate:String(row.trade_date||""),
        closePrice:Number(row.close_price),
      }))
      .filter(row=>row.tradeDate && Number.isFinite(row.closePrice));
  }

  function getCachedRealHistory(){
    return realHistoryCache.get(getRealHistorySymbol()) || [];
  }

  function ensureRealHistoryLoaded(){
    const symbol=getRealHistorySymbol();
    if(realHistoryCache.has(symbol) || realHistoryLoads.has(symbol)) return;
    const url=`${forecastApiBase}/api/market/series?symbol=${encodeURIComponent(symbol)}&limit=5000`;
    const request=fetch(url)
      .then(response=>{
        if(!response.ok) throw new Error(`HTTP ${response.status}`);
        return response.json();
      })
      .then(payload=>{
        realHistoryCache.set(symbol,normalizeRealHistoryRows(payload&&payload.rows));
        realHistoryLoads.delete(symbol);
        if(window.fcInited) drawForecast();
      })
      .catch(error=>{
        realHistoryLoads.delete(symbol);
        console.warn(`Failed to load forecast history for ${symbol}.`,error);
      });
    realHistoryLoads.set(symbol,request);
  }

  function buildSeries(){
    ensureRealHistoryLoaded();
    const realHistoryRows=getCachedRealHistory().slice(-forecastHistoryLimit);
    const hist=realHistoryRows.map(row=>row.closePrice);
    const dates=realHistoryRows.map(row=>parseMarketDate(row.tradeDate));
    const spot=hist.length?hist[hist.length-1]:null;
    return{
      hist,
      fut:[],
      bands:[],
      spot,
      volBoost:1,
      combined:hist.slice(),
      dates,
    };
  }

  function resetView(total){
    if(!total||total<=0){
      state.viewCount=0;
      state.viewStart=0;
      return;
    }
    state.viewCount=Math.min(300,total);
    state.viewStart=Math.max(0,total-state.viewCount);
  }

  function setForecastHistoryStats(spot){
    const isLight=fcIsLight();
    $("fc-stat-pt-label").textContent="预测（待接入）";
    $("fc-stat-spot").textContent=spot==null ? "—" : money(spot);
    $("fc-stat-point").textContent="待接入";
    $("fc-stat-80").textContent="待接入";
    $("fc-stat-dir").textContent="待接入";
    const badge=$("fc-risk-badge-hero");
    if(badge){
      badge.style.border=isLight ? "1px solid rgba(122,95,60,.18)" : "1px solid rgba(111,208,255,.28)";
      badge.style.background=isLight ? "rgba(166,123,66,.08)" : "rgba(111,208,255,.08)";
      badge.innerHTML=isLight
        ? '<span class="fc-risk-dot" style="background:#a67b42;box-shadow:0 0 0 3px rgba(166,123,66,.12)"></span> 历史数据模式'
        : '<span class="fc-risk-dot" style="background:#6fd0ff;box-shadow:0 0 0 3px rgba(111,208,255,.14)"></span> 历史数据模式';
    }
  }

  function renderForecastMessage(svg,message){
    const text=svgEl("text",{
      x:"550",
      y:"240",
      fill:"rgba(240,240,242,.72)",
      "font-size":"18",
      "text-anchor":"middle"
    });
    text.textContent=message;
    svg.appendChild(text);
  }

  function getForecastPlotRect(){
    const svgRect=$("fc-chart").getBoundingClientRect();
    const plotLeft=svgRect.left + svgRect.width*(56/1100);
    const plotWidth=svgRect.width*((1100-56-20)/1100);
    return {
      left:plotLeft,
      width:Math.max(plotWidth,1),
    };
  }

  /* ── Draw forecast chart ── */
  function drawForecast(){
    const series=buildSeries();
    {
      const total=series.combined.length;
      const svg=$("fc-chart");
      svg.innerHTML="";

      if(!total){
        $("fc-view-pill").textContent="视图：加载中";
        setForecastHistoryStats(null);
        renderForecastMessage(svg,"正在加载真实历史数据...");
        return;
      }

      const minView=Math.min(60,total);
      const maxView=Math.min(300,total);
      state.viewCount=clamp(state.viewCount||maxView,minView,maxView);
      state.viewStart=clamp(state.viewStart,0,Math.max(0,total-state.viewCount));
      $("fc-view-pill").textContent=`视图：${state.viewCount} 点`;

      const viewStart=state.viewStart;
      const viewEnd=viewStart+state.viewCount-1;
      let vMin=Infinity;
      let vMax=-Infinity;
      for(let gi=viewStart;gi<=viewEnd;gi++){
        vMin=Math.min(vMin,series.combined[gi]);
        vMax=Math.max(vMax,series.combined[gi]);
      }
      if(!Number.isFinite(vMin)||!Number.isFinite(vMax)){
        setForecastHistoryStats(series.spot);
        renderForecastMessage(svg,"暂无可展示的真实历史数据");
        return;
      }
      if(vMin===vMax){
        vMin-=1;
        vMax+=1;
      }else{
        vMin-=2.5;
        vMax+=2.5;
      }

      const W=1100,H=480,pL=56,pR=20,pT=24,pB=40,plotW=W-pL-pR,plotH=H-pT-pB;
      const x=vi=>state.viewCount<=1 ? pL+plotW/2 : pL+(vi/(state.viewCount-1))*plotW;
      const y=v=>pT+(1-(v-vMin)/(vMax-vMin))*plotH;

      for(let i=0;i<=5;i++){
        const yy=pT+(i/5)*plotH;
        svg.appendChild(svgEl("line",{x1:pL,x2:W-pR,y1:yy,y2:yy,stroke:"rgba(255,255,255,.05)","stroke-width":"1","stroke-dasharray":"4 6"}));
        const txt=svgEl("text",{x:8,y:yy+4,fill:"rgba(200,180,130,.55)","font-size":"11"});
        txt.textContent=money(vMax-(i/5)*(vMax-vMin));
        svg.appendChild(txt);
      }

      const yBase=pT+plotH;
      for(let i=0;i<6;i++){
        const vi=Math.round(i/5*(state.viewCount-1));
        const gi=viewStart+vi;
        const xx=x(vi);
        svg.appendChild(svgEl("line",{x1:xx,x2:xx,y1:yBase,y2:yBase+5,stroke:"rgba(255,255,255,.1)","stroke-width":"1"}));
        const txt=svgEl("text",{x:xx,y:yBase+18,fill:"rgba(200,180,130,.55)","font-size":"11","text-anchor":"middle"});
        txt.textContent=fmtDate(series.dates[gi]).slice(5);
        svg.appendChild(txt);
      }

      const historyPts=[];
      for(let gi=viewStart;gi<=viewEnd;gi++){
        historyPts.push({gi,vi:gi-viewStart});
      }
      if(historyPts.length>=2){
        svg.appendChild(svgEl("path",{
          d:pathD(historyPts.map(p=>x(p.vi)),historyPts.map(p=>y(series.combined[p.gi]))),
          fill:"none",
          stroke:"rgba(111,208,255,.9)",
          "stroke-width":"2"
        }));
        const last=historyPts[historyPts.length-1];
        svg.appendChild(svgEl("circle",{cx:x(last.vi),cy:y(series.combined[last.gi]),r:"5",fill:"rgba(111,208,255,1)",stroke:"rgba(8,12,16,.9)","stroke-width":"2"}));
      }else if(historyPts.length===1){
        svg.appendChild(svgEl("circle",{cx:x(0),cy:y(series.combined[historyPts[0].gi]),r:"4.5",fill:"rgba(111,208,255,.9)",stroke:"rgba(8,12,16,.9)","stroke-width":"2"}));
      }

      const cross=svgEl("line",{y1:pT,y2:pT+plotH,stroke:"rgba(216,179,106,.25)","stroke-width":"1","stroke-dasharray":"5 5"});
      cross.style.display="none";
      svg.appendChild(cross);
      const hdot=svgEl("circle",{r:"4.5",fill:"rgba(232,237,245,.9)",stroke:"rgba(8,12,16,.9)","stroke-width":"2"});
      hdot.style.display="none";
      svg.appendChild(hdot);
      const overlay=svgEl("rect",{x:pL,y:pT,width:plotW,height:plotH,fill:"transparent"});
      overlay.style.cursor="crosshair";
      svg.appendChild(overlay);
      const tip=$("fc-tip");
      overlay.addEventListener("mousemove",e=>{
        const plotRect=getForecastPlotRect();
        const wrapRect=$("fc-chart-wrap").getBoundingClientRect();
        const vi=Math.round(clamp((e.clientX-plotRect.left)/plotRect.width,0,1)*(state.viewCount-1));
        const gi=viewStart+vi;
        const xx=x(vi);
        cross.setAttribute("x1",xx);
        cross.setAttribute("x2",xx);
        cross.style.display="block";
        hdot.setAttribute("cx",xx);
        hdot.setAttribute("cy",y(series.combined[gi]));
        hdot.style.display="block";
        let html=`<div style="font-weight:900;color:var(--fc-gold);margin-bottom:4px">${state.asset==="brent"?"Brent":"WTI"} · 历史</div>`;
        html+=`<div class="row"><span class="k">日期</span><span>${fmtDate(series.dates[gi])}</span></div>`;
        html+=`<div class="row"><span class="k">价格</span><span><strong>${money(series.combined[gi])}</strong></span></div>`;
        tip.innerHTML=html;
        tip.style.display="block";
        const relX=e.clientX-wrapRect.left;
        const relY=e.clientY-wrapRect.top;
        const tipGap=14;
        const tipWidth=tip.offsetWidth||260;
        const tipHeight=tip.offsetHeight||120;
        let tipLeft=relX+tipGap;
        if(relX>wrapRect.width*.58 || tipLeft+tipWidth>wrapRect.width-tipGap){
          tipLeft=relX-tipWidth-tipGap;
        }
        tipLeft=clamp(tipLeft,tipGap,Math.max(tipGap,wrapRect.width-tipWidth-tipGap));
        let tipTop=relY-tipHeight/2;
        tipTop=clamp(tipTop,tipGap,Math.max(tipGap,wrapRect.height-tipHeight-tipGap));
        tip.style.left=`${tipLeft}px`;
        tip.style.top=`${tipTop}px`;
      });
      overlay.addEventListener("mouseleave",()=>{
        tip.style.display="none";
        cross.style.display="none";
        hdot.style.display="none";
      });

      setForecastHistoryStats(series.spot);
      return;
    }
    const nH=series.hist.length,total=series.combined.length;
    state.viewCount=clamp(state.viewCount,60,Math.min(300,total));
    state.viewStart=clamp(state.viewStart,0,Math.max(0,total-state.viewCount));
    $("fc-view-pill").textContent=`视图：${state.viewCount} 天`;

    const v0=state.viewStart,v1=v0+state.viewCount-1;
    let vMin=Infinity,vMax=-Infinity;
    for(let gi=v0;gi<=v1;gi++){
      vMin=Math.min(vMin,series.combined[gi]);vMax=Math.max(vMax,series.combined[gi]);
      if(gi>=nH){const j=gi-nH;if(series.bands[j]){vMin=Math.min(vMin,series.bands[j].p95[0]);vMax=Math.max(vMax,series.bands[j].p95[1]);}}
    }
    vMin-=2.5;vMax+=2.5;

    const svg=$("fc-chart");svg.innerHTML="";
    const W=1100,H=480,pL=56,pR=20,pT=24,pB=40,plotW=W-pL-pR,plotH=H-pT-pB;
    const x=vi=>pL+(vi/(state.viewCount-1))*plotW;
    const y=v=>pT+(1-(v-vMin)/(vMax-vMin))*plotH;

    // Grid
    for(let i=0;i<=5;i++){
      const yy=pT+(i/5)*plotH;
      svg.appendChild(svgEl("line",{x1:pL,x2:W-pR,y1:yy,y2:yy,stroke:"rgba(255,255,255,.05)","stroke-width":"1","stroke-dasharray":"4 6"}));
      const txt=svgEl("text",{x:8,y:yy+4,fill:"rgba(200,180,130,.55)","font-size":"11"});
      txt.textContent=money(vMax-(i/5)*(vMax-vMin));svg.appendChild(txt);
    }
    // X axis ticks
    const yBase=pT+plotH;
    for(let i=0;i<6;i++){
      const vi=Math.round(i/5*(state.viewCount-1));
      const gi=v0+vi,xx=x(vi);
      svg.appendChild(svgEl("line",{x1:xx,x2:xx,y1:yBase,y2:yBase+5,stroke:"rgba(255,255,255,.1)","stroke-width":"1"}));
      const txt=svgEl("text",{x:xx,y:yBase+18,fill:"rgba(200,180,130,.55)","font-size":"11","text-anchor":"middle"});
      txt.textContent=fmtDate(series.dates[gi]).slice(5);svg.appendChild(txt);
    }
    // Now line
    const splitGi=nH-1;
    if(splitGi>=v0&&splitGi<=v1){
      const sl=svgEl("line",{x1:x(splitGi-v0),x2:x(splitGi-v0),y1:pT,y2:pT+plotH,stroke:"rgba(216,179,106,.28)","stroke-width":"1.5","stroke-dasharray":"6 6"});
      svg.appendChild(sl);
    }
    // Future bands
    const visF=[];for(let gi=v0;gi<=v1;gi++){if(gi>=nH)visF.push({gi,vi:gi-v0});}
    if(visF.length>=2){
      function bandPath(key){
        const top=visF.map(p=>[x(p.vi),y(series.bands[p.gi-nH][key][1])]);
        const bot=visF.slice().reverse().map(p=>[x(p.vi),y(series.bands[p.gi-nH][key][0])]);
        return top.concat(bot).map((pt,i)=>(i===0?"M":"L")+pt[0].toFixed(2)+" "+pt[1].toFixed(2)).join(" ")+"Z";
      }
      svg.appendChild(svgEl("path",{d:bandPath("p95"),fill:"url(#band95Grad)",stroke:"rgba(216,179,106,.10)","stroke-width":"1"}));
      svg.appendChild(svgEl("path",{d:bandPath("p80"),fill:"url(#band80Grad)",stroke:"rgba(216,179,106,.18)","stroke-width":"1"}));
      // Add gradient defs for smooth bands
      const defs=svgEl("defs",{});
      defs.innerHTML=`
        <linearGradient id="band95Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(216,179,106,.04)"/>
          <stop offset="50%" stop-color="rgba(216,179,106,.08)"/>
          <stop offset="100%" stop-color="rgba(216,179,106,.04)"/>
        </linearGradient>
        <linearGradient id="band80Grad" x1="0" y1="0" x2="0" y2="1">
          <stop offset="0%" stop-color="rgba(216,179,106,.08)"/>
          <stop offset="50%" stop-color="rgba(216,179,106,.16)"/>
          <stop offset="100%" stop-color="rgba(216,179,106,.08)"/>
        </linearGradient>
      `;
      svg.insertBefore(defs, svg.firstChild);
    }
    // History line
    const hPts=[];for(let gi=v0;gi<=v1&&gi<nH;gi++)hPts.push({gi,vi:gi-v0});
    if(hPts.length>=2){
      svg.appendChild(svgEl("path",{d:pathD(hPts.map(p=>x(p.vi)),hPts.map(p=>y(series.combined[p.gi]))),fill:"none",stroke:"rgba(111,208,255,.9)","stroke-width":"2"}));
    }
    // Forecast line
    if(visF.length>=1){
      let cxs=[],cys=[];
      if(splitGi>=v0&&splitGi<=v1){cxs=[x(splitGi-v0)];cys=[y(series.hist[splitGi])];}
      cxs=cxs.concat(visF.map(p=>x(p.vi)));cys=cys.concat(visF.map(p=>y(series.combined[p.gi])));
      svg.appendChild(svgEl("path",{d:pathD(cxs,cys),fill:"none",stroke:"rgba(216,179,106,.9)","stroke-width":"2","stroke-dasharray":"8 5"}));
      const last=visF[visF.length-1];
      svg.appendChild(svgEl("circle",{cx:x(last.vi),cy:y(series.combined[last.gi]),r:"5",fill:"rgba(216,179,106,1)",stroke:"rgba(8,12,16,.9)","stroke-width":"2"}));
    }
    // Hover
    const cross=svgEl("line",{y1:pT,y2:pT+plotH,stroke:"rgba(216,179,106,.25)","stroke-width":"1","stroke-dasharray":"5 5"});cross.style.display="none";svg.appendChild(cross);
    const hdot=svgEl("circle",{r:"4.5",fill:"rgba(232,237,245,.9)",stroke:"rgba(8,12,16,.9)","stroke-width":"2"});hdot.style.display="none";svg.appendChild(hdot);
    const overlay=svgEl("rect",{x:pL,y:pT,width:plotW,height:plotH,fill:"transparent"});overlay.style.cursor="crosshair";svg.appendChild(overlay);
    const tip=$("fc-tip");
    overlay.addEventListener("mousemove",e=>{
      const rect=$("fc-chart-wrap").getBoundingClientRect();
      const vi=Math.round(clamp((e.clientX-rect.left)/rect.width,0,1)*(state.viewCount-1));
      const gi=v0+vi,xx=x(vi);
      cross.setAttribute("x1",xx);cross.setAttribute("x2",xx);cross.style.display="block";
      hdot.setAttribute("cx",xx);hdot.setAttribute("cy",y(series.combined[gi]));hdot.style.display="block";
      const isFut=gi>=nH;
      let html=`<div style="font-weight:900;color:var(--fc-gold);margin-bottom:4px">${state.asset==="brent"?"Brent":"WTI"} · ${isFut?"预测":"历史"}</div>`;
      html+=`<div class="row"><span class="k">日期</span><span>${fmtDate(series.dates[gi])}</span></div>`;
      if(isFut){
        const b=series.bands[gi-nH];
        const mu=b.y,sigma=Math.max(1e-6,b.sigma);
        const w80=b.p80[1]-b.p80[0];
        const pUp=clamp(1-normCdf((series.spot-mu)/sigma),0,1);
        html+=`<div class="row"><span class="k">点预测</span><span><strong>${money(mu)}</strong></span></div>`;
        html+=`<div class="row"><span class="k">80% 区间</span><span>${money(b.p80[0])} ~ ${money(b.p80[1])}</span></div>`;
        html+=`<div class="row"><span class="k">涨跌概率</span><span>↑${(pUp*100).toFixed(0)}% / ↓${((1-pUp)*100).toFixed(0)}%</span></div>`;
      }else{
        html+=`<div class="row"><span class="k">价格</span><span><strong>${money(series.combined[gi])}</strong></span></div>`;
      }
      tip.innerHTML=html;
      tip.style.display="block";
      const relX=e.clientX-rect.left;
      const relY=e.clientY-rect.top;
      const tipGap=14;
      const tipWidth=tip.offsetWidth||260;
      const tipHeight=tip.offsetHeight||120;
      let tipLeft=relX+tipGap;
      if(relX>rect.width*.58 || tipLeft+tipWidth>rect.width-tipGap){
        tipLeft=relX-tipWidth-tipGap;
      }
      tipLeft=clamp(tipLeft,tipGap,Math.max(tipGap,rect.width-tipWidth-tipGap));
      let tipTop=relY-tipHeight/2;
      tipTop=clamp(tipTop,tipGap,Math.max(tipGap,rect.height-tipHeight-tipGap));
      tip.style.left=`${tipLeft}px`;
      tip.style.top=`${tipTop}px`;
    });
    overlay.addEventListener("mouseleave",()=>{tip.style.display="none";cross.style.display="none";hdot.style.display="none";});

    // Stats
    const last=series.bands[series.bands.length-1];
    const mu=last.y,sigma=Math.max(1e-6,last.sigma);
    const w80=last.p80[1]-last.p80[0];
    const pUp=clamp(1-normCdf((series.spot-mu)/sigma),0,1);
    $("fc-stat-pt-label").textContent=`点预测（T+${state.horizon}）`;
    $("fc-stat-spot").textContent=money(series.spot);
    $("fc-stat-point").textContent=money(mu);
    $("fc-stat-80").textContent=`${money(w80)} (±${money(w80/2)})`;
    $("fc-stat-dir").textContent=`↑${(pUp*100).toFixed(0)}% / ↓${((1-pUp)*100).toFixed(0)}%`;

    // Risk badge
    const score=series.volBoost*(1+(state.horizon/30)*.6);
    let lvl="低",dotStyle="background:#39d98a;box-shadow:0 0 0 3px rgba(57,217,138,.15)",borderC="rgba(57,217,138,.3)",bgC="rgba(57,217,138,.08)";
    if(score>=1.9){lvl="高";dotStyle="background:#ff5c7c;box-shadow:0 0 0 3px rgba(255,92,124,.15)";borderC="rgba(255,92,124,.3)";bgC="rgba(255,92,124,.08)";}
    else if(score>=1.35){lvl="中";dotStyle="background:#f5c842;box-shadow:0 0 0 3px rgba(245,200,66,.15)";borderC="rgba(245,200,66,.3)";bgC="rgba(245,200,66,.08)";}
    const rhEl=$("fc-risk-badge-hero");
    rhEl.style.border=`1px solid ${borderC}`;rhEl.style.background=bgC;
    rhEl.innerHTML=`<span class="fc-risk-dot" style="${dotStyle}"></span> 风险等级：${lvl}`;

    updateIndustry(series);
    drawFactors(series);
    drawBacktest(series);
  }

  /* ── Industry impact ── */
  const legacyImpactIndustries=[
    {name:"航空",key:"air",note:"燃油成本敏感"},
    {name:"航运",key:"ship",note:"燃油/运价联动"},
    {name:"化工",key:"chem",note:"原料端压力"},
    {name:"炼化",key:"ref",note:"裂解价差驱动"},
    {name:"物流",key:"log",note:"运力+油价叠加"},
    {name:"钢铁",key:"steel",note:"能源成本上升"},
  ];
  function legacyRenderImpactGrid(){
    const grid=$("fc-impact-grid");grid.innerHTML="";
    industries.forEach(ind=>{
      const div=document.createElement("div");div.className="fc-impact";
      div.innerHTML=`<div class="fc-impact-name"><span>${ind.name}</span><span class="fc-pill" id="imp-tag-${ind.key}">—</span></div>
        <div class="fc-bars">
          <div class="fc-bar-row"><span class="k">成本</span><span class="fc-bar-bg"><i id="imp-c-${ind.key}"></i></span></div>
          <div class="fc-bar-row"><span class="k">利润</span><span class="fc-bar-bg"><i id="imp-m-${ind.key}"></i></span></div>
          <div class="fc-bar-row"><span class="k">融资</span><span class="fc-bar-bg"><i id="imp-f-${ind.key}"></i></span></div>
        </div>
        <div style="font-size:11px;color:var(--fc-muted);margin-top:8px">${ind.note}</div>`;
      grid.appendChild(div);
    });
  }
  function legacyUpdateIndustry(series){
    const ret=(series.bands[series.bands.length-1].y-series.spot)/series.spot;
    const vol=series.volBoost;
    const dirUp=clamp((ret+.03)/.10,0,1),uncert=clamp((vol-1.0)/1.2,0,1);
    const w={air:{c:.95,m:.85,f:.55},ship:{c:.70,m:.60,f:.45},chem:{c:.75,m:.70,f:.55},ref:{c:.55,m:.80,f:.50},log:{c:.80,m:.65,f:.45},steel:{c:.60,m:.70,f:.55}};
    const scores=[];
    industries.forEach(ind=>{
      const ww=w[ind.key];
      const cost=clamp(.15+dirUp*ww.c*.75+uncert*.20,0,1);
      const margin=clamp(.15+dirUp*ww.m*.55+uncert*.35,0,1);
      const fin=clamp(.10+dirUp*ww.f*.35+uncert*.55,0,1);
      const c=$("imp-c-"+ind.key),m=$("imp-m-"+ind.key),f=$("imp-f-"+ind.key);
      if(c)c.style.width=Math.round(cost*100)+"%";
      if(m)m.style.width=Math.round(margin*100)+"%";
      if(f)f.style.width=Math.round(fin*100)+"%";
      const ov=cost*.45+margin*.35+fin*.20;
      scores.push({name:ind.name,ov});
      const tag=$("imp-tag-"+ind.key);
      if(tag)tag.textContent=ov>.72?"压力偏高":ov>.48?"压力适中":"压力可控";
    });
    scores.sort((a,b)=>b.ov-a.ov);
    const top3=scores.slice(0,3).map(x=>x.name).join("、");
    const summary=$("fc-impact-summary");
    if(summary) summary.textContent=`T+${state.horizon} 预测${ret>=0?"上行":"下行"}倾向，${vol>=1.9?"不确定性偏高":vol>=1.35?"不确定性中等":"不确定性偏低"}。压力突出行业：${top3}。`;
  }

  /* ── Consensus ── */
  const industries=[
    {
      name:"航空",
      key:"air",
      notes:{
        up:"燃油成本敏感；对冲覆盖不足时利润波动更明显",
        down:"油价回落缓解航油成本，但票价与客座率仍决定利润修复",
        stress:"汇率与油价共振时，现金流敏感度会进一步放大"
      }
    },
    {
      name:"航运",
      key:"ship",
      notes:{
        up:"燃油/运价联动；成本传导能力分化更明显",
        down:"油价回落缓解成本，但运价与航线供给仍决定盈利弹性",
        stress:"运费波动上行时，融资与保险支出会同步抬升"
      }
    },
    {
      name:"化工",
      key:"chem",
      notes:{
        up:"原料端抬升；价差与库存周期决定利润弹性",
        down:"成本边际缓和后，利润修复仍取决于终端需求与价差",
        stress:"原料采购与库存再定价会放大利润波动"
      }
    },
    {
      name:"炼化",
      key:"ref",
      notes:{
        up:"裂解价差决定盈利；原油上涨不等于利润同步走强",
        down:"原油回落有利原料端，但成品油裂解仍是核心变量",
        stress:"库存重估与价差波动会压缩阶段性利润空间"
      }
    },
    {
      name:"物流",
      key:"log",
      notes:{
        up:"运力与油价叠加；费用率上行会压缩毛利",
        down:"成本边际缓和，但价格竞争与需求节奏仍会压制利润",
        stress:"油价和融资成本同步走高时，现金流压力会更明显"
      }
    },
    {
      name:"钢铁",
      key:"steel",
      notes:{
        up:"能源成本占比上升；需求放缓会放大压力",
        down:"成本缓和有利制造端，但需求恢复才决定利润修复斜率",
        stress:"能源与地产链扰动共振时，利润波动更易放大"
      }
    },
  ];
  function ensureImpactShell(){
    const grid=$("fc-impact-grid");
    const card=grid&&grid.closest?grid.closest(".fc-card"):null;
    if(card){
      const title=card.querySelector(".fc-card-head h3");
      const pill=card.querySelector(".fc-card-head .fc-pill");
      if(title) title.textContent="行业冲击";
      if(pill) pill.remove();
    }
  }
  function impactMetricRow(label,id){
    return `<div class="fc-impact-row"><span class="fc-impact-label">${label}</span><span class="fc-impact-track"><i id="${id}" class="fc-impact-fill"></i></span></div>`;
  }
  function renderImpactGrid(){
    ensureImpactShell();
    const grid=$("fc-impact-grid");
    if(!grid) return;
    grid.innerHTML=industries.map(ind=>`
      <div class="fc-impact-card" id="fc-impact-card-${ind.key}" data-level="low">
        <div class="fc-impact-top">
          <div class="fc-impact-title">${ind.name}</div>
          <span class="fc-impact-status low" id="imp-tag-${ind.key}">压力可控</span>
        </div>
        <div class="fc-impact-metrics">
          ${impactMetricRow("成本压力",`imp-c-${ind.key}`)}
          ${impactMetricRow("利润风险",`imp-m-${ind.key}`)}
          ${impactMetricRow("融资压力",`imp-f-${ind.key}`)}
        </div>
        <div class="fc-impact-note" id="imp-note-${ind.key}">${ind.notes.up}</div>
      </div>
    `).join("");
  }
  function impactState(score){
    if(score>=.72) return {label:"压力偏高",cls:"high"};
    if(score>=.48) return {label:"压力适中",cls:"mid"};
    return {label:"压力可控",cls:"low"};
  }
  function setImpactBar(id,value){
    const el=$(id);
    if(!el) return;
    el.style.width=Math.round(clamp(value,0,1)*100)+"%";
  }
  function normalizeScenarioFactor(key){
    return clamp((state.factors[key]||0)/10,-1,1);
  }
  function getScenarioSignals(ret,uncert){
    const raw={
      opec:normalizeScenarioFactor("opec"),
      inventory:normalizeScenarioFactor("inventory"),
      usd:normalizeScenarioFactor("usd"),
      geo:normalizeScenarioFactor("geo"),
      shipping:normalizeScenarioFactor("shipping"),
      demand:normalizeScenarioFactor("demand")
    };
    const driver=(-raw.opec*.18)+(-raw.inventory*.12)+(-raw.usd*.10)+(raw.shipping*.12)+(raw.demand*.15);
    return {
      raw,
      priceUp:clamp(Math.max(ret/.06,driver/.28,0),0,1),
      priceDown:clamp(Math.max(-ret/.06,-driver/.28,0),0,1),
      demandUp:clamp(raw.demand,0,1),
      demandDown:clamp(-raw.demand,0,1),
      usdUp:clamp(raw.usd,0,1),
      shippingUp:clamp(raw.shipping,0,1),
      inventoryBuild:clamp(raw.inventory,0,1),
      geoRisk:Math.abs(raw.geo),
      uncertainty:clamp(Math.max(uncert,Math.abs(raw.geo)*.78+Math.abs(raw.shipping)*.22),0,1)
    };
  }
  function computeMetricPressure(profile,signals){
    return clamp(Object.entries(profile).reduce((sum,[key,weight])=>sum+(signals[key]||0)*weight,0),0,1);
  }
  function pickImpactDriver(indKey,signals){
    const drivers={
      air:[
        {value:signals.priceUp,text:"油价上行"},
        {value:signals.usdUp,text:"美元走强"},
        {value:signals.demandDown,text:"需求走弱"},
        {value:signals.geoRisk,text:"地缘风险升温"}
      ],
      ship:[
        {value:signals.shippingUp,text:"航运扰动"},
        {value:signals.priceUp,text:"燃油上行"},
        {value:signals.geoRisk,text:"风险溢价抬升"},
        {value:signals.demandDown,text:"运需走弱"}
      ],
      chem:[
        {value:signals.priceUp,text:"原料抬升"},
        {value:signals.demandDown,text:"终端需求走弱"},
        {value:signals.inventoryBuild,text:"库存累积"},
        {value:signals.usdUp,text:"美元偏强"}
      ],
      ref:[
        {value:signals.demandDown,text:"成品油需求走弱"},
        {value:signals.priceUp,text:"原油价格走高"},
        {value:signals.inventoryBuild,text:"库存重估"},
        {value:signals.shippingUp,text:"物流摩擦加大"}
      ],
      log:[
        {value:signals.priceUp,text:"油价抬升"},
        {value:signals.shippingUp,text:"运力紧张"},
        {value:signals.demandDown,text:"货运需求偏弱"},
        {value:signals.usdUp,text:"资金成本上升"}
      ],
      steel:[
        {value:signals.demandDown,text:"需求放缓"},
        {value:signals.priceUp,text:"能源成本上行"},
        {value:signals.usdUp,text:"美元走强"},
        {value:signals.geoRisk,text:"宏观风险升温"}
      ]
    };
    const ranked=(drivers[indKey]||[]).sort((a,b)=>b.value-a.value);
    return ranked[0]&&ranked[0].value>.16?ranked[0].text:"当前情景";
  }
  function composeImpactNote(ind,metrics,signals){
    const dominantMetric=metrics.cost>=metrics.margin&&metrics.cost>=metrics.finance
      ? "cost"
      : (metrics.margin>=metrics.finance ? "margin" : "finance");
    const driverText=pickImpactDriver(ind.key,signals);
    const baseNote=signals.priceUp>=signals.priceDown ? ind.notes.up : ind.notes.down;
    if(signals.uncertainty>.62||dominantMetric==="finance") return `${driverText}正在主导本轮冲击；${ind.notes.stress}`;
    if(dominantMetric==="margin") return `${driverText}对盈利端影响更直接；${baseNote}`;
    return `${driverText}对成本端传导更快；${baseNote}`;
  }
  function updateIndustry(series){
    ensureImpactShell();
    const band=series.bands[series.bands.length-1]||{y:series.spot,sigma:1};
    const ret=(band.y-series.spot)/series.spot;
    const signals=getScenarioSignals(ret,clamp((series.volBoost-1.0)/1.15,0,1));
    const profiles={
      air:{
        cost:{priceUp:.40,usdUp:.18,shippingUp:.06,uncertainty:.10,geoRisk:.06},
        margin:{priceUp:.22,demandDown:.24,usdUp:.08,uncertainty:.10},
        finance:{usdUp:.20,uncertainty:.18,geoRisk:.10}
      },
      ship:{
        cost:{shippingUp:.34,priceUp:.18,usdUp:.06,uncertainty:.08},
        margin:{shippingUp:.12,demandDown:.18,priceDown:.08,uncertainty:.10},
        finance:{uncertainty:.18,geoRisk:.12,usdUp:.10}
      },
      chem:{
        cost:{priceUp:.34,usdUp:.10,inventoryBuild:.08,uncertainty:.10},
        margin:{priceUp:.18,demandDown:.22,inventoryBuild:.12,uncertainty:.12},
        finance:{usdUp:.12,uncertainty:.18,inventoryBuild:.08}
      },
      ref:{
        cost:{priceUp:.20,shippingUp:.08,inventoryBuild:.08,uncertainty:.08},
        margin:{demandDown:.26,priceUp:.10,inventoryBuild:.10,uncertainty:.14},
        finance:{usdUp:.10,uncertainty:.18,geoRisk:.08}
      },
      log:{
        cost:{priceUp:.36,shippingUp:.16,usdUp:.08,uncertainty:.08},
        margin:{priceUp:.18,demandDown:.22,shippingUp:.08,uncertainty:.12},
        finance:{usdUp:.12,uncertainty:.20,geoRisk:.06}
      },
      steel:{
        cost:{priceUp:.20,usdUp:.12,uncertainty:.10,inventoryBuild:.06},
        margin:{demandDown:.28,priceUp:.10,usdUp:.06,uncertainty:.14},
        finance:{usdUp:.14,uncertainty:.18,geoRisk:.08}
      }
    };
    industries.forEach(ind=>{
      const profile=profiles[ind.key];
      const cost=clamp(.10+computeMetricPressure(profile.cost,signals),0,1);
      const margin=clamp(.10+computeMetricPressure(profile.margin,signals),0,1);
      const finance=clamp(.08+computeMetricPressure(profile.finance,signals),0,1);
      const overall=cost*.44+margin*.36+finance*.20;
      const stateTag=impactState(overall);
      setImpactBar(`imp-c-${ind.key}`,cost);
      setImpactBar(`imp-m-${ind.key}`,margin);
      setImpactBar(`imp-f-${ind.key}`,finance);
      const card=$(`fc-impact-card-${ind.key}`);
      if(card) card.setAttribute("data-level",stateTag.cls);
      const tag=$(`imp-tag-${ind.key}`);
      if(tag){
        tag.textContent=stateTag.label;
        tag.className=`fc-impact-status ${stateTag.cls}`;
      }
      const note=$(`imp-note-${ind.key}`);
      if(note) note.textContent=composeImpactNote(ind,{cost,margin,finance},signals);
    });
    const summary=$("fc-impact-summary");
    if(summary) summary.textContent="";
  }
  const consensusData=[
    {name:"EIA",annual:86.2,bias:"mid",logic:"供需再平衡；库存回落但产量弹性仍在"},
    {name:"Wind一致",annual:84.7,bias:"mid",logic:"宏观偏中性；供给扰动与需求修复抵消"},
    {name:"德意志银行",annual:89.4,bias:"low",logic:"OPEC+纪律性偏强；风险溢价维持"},
    {name:"高盛",annual:91.8,bias:"low",logic:"需求韧性 + 低库存 → 上行尾部更重"},
    {name:"摩根士丹利",annual:82.9,bias:"high",logic:"经济放缓风险；供给增长压制油价"},
  ];
  function renderConsensus(){
    const tbody=$("fc-consensus-tbody");tbody.innerHTML="";
    const dotColor=b=>b==="low"?"#39d98a":b==="high"?"#ff5c7c":"#f5c842";
    consensusData.forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td><div style="display:flex;align-items:center;gap:8px"><span style="width:7px;height:7px;border-radius:50%;background:${dotColor(r.bias)};flex-shrink:0;display:inline-block"></span><strong style="font-size:12px">${r.name}</strong></div></td><td><strong style="color:var(--fc-gold)">${money(r.annual)}</strong></td><td><div class="fc-logic">${r.logic}</div></td>`;
      tbody.appendChild(tr);
    });
  }

  /* ── Sliders ── */
  const brentConsensusData=[
    {name:"路透调查一致预期",publish:"2026-01-05",price:"61.27",type:"2026年均"},
    {name:"高盛",publish:"2026-01-12",price:"56",type:"2026年均"},
    {name:"摩根大通",publish:"2025-11-24",price:"58",type:"2026年均"},
    {name:"摩根士丹利",publish:"2025-11-03",price:"60",type:"2026上半年均值"},
    {name:"巴克莱",publish:"2025-12-16",price:"65",type:"2026年均"},
    {name:"花旗",publish:"2025-10-01",price:"62",type:"2026Q2-Q4季度均值"},
  ];
  renderConsensus=function(){
    const consensusCard=document.getElementById("fc-consensus-tbody")?.closest(".fc-card");
    if(consensusCard) consensusCard.classList.add("fc-consensus-card");
    const titleEl=consensusCard?.querySelector(".fc-card-head h3");
    if(titleEl) titleEl.textContent="Brent市场一致预期";
    const thead=consensusCard?.querySelector("thead");
    if(thead) thead.innerHTML="<tr><th>机构</th><th>发布时间</th><th>预期价格</th><th>类型</th></tr>";
    const noteEl=consensusCard?.querySelector(".fc-note");
    if(noteEl) noteEl.textContent="该表展示 Brent 相关机构一致预期，包含发布时间、预期价格与统计口径，和上方 T+1/T+7/T+30 短期预测属于不同时间尺度。";
    const tbody=$("fc-consensus-tbody");
    if(!tbody) return;
    tbody.innerHTML="";
    brentConsensusData.forEach(r=>{
      const tr=document.createElement("tr");
      tr.innerHTML=`<td><strong style="font-size:12px">${r.name}</strong></td><td>${r.publish}</td><td><strong style="color:var(--fc-gold)">${r.price}</strong></td><td>${r.type}</td>`;
      tbody.appendChild(tr);
    });
  };

  const sliderDefs=[
    {key:"opec",name:"OPEC+供给",hint:"↓更紧 → 上行",sign:-1},
    {key:"inventory",name:"美国库存",hint:"↑偏空 → 下行",sign:-1},
    {key:"usd",name:"美元指数",hint:"↑压制 → 下行",sign:-1},
    {key:"geo",name:"地缘风险",hint:"↑→ 区间加宽",sign:0},
    {key:"shipping",name:"航运紧张(BDTI)",hint:"↑→ 上行+波动",sign:1},
    {key:"demand",name:"需求动能",hint:"↑→ 上行",sign:1},
  ];
  function renderSliders(){
    const grid=$("fc-sliders");grid.innerHTML="";
    sliderDefs.forEach(d=>{
      const div=document.createElement("div");div.className="fc-slider";
      div.innerHTML=`<div class="fc-slider-top"><div class="name">${d.name}</div><div class="val"><span id="fc-sv-${d.key}">0</span>/10</div></div><input type="range" min="-10" max="10" step="1" value="0" id="fc-rng-${d.key}"><div class="fc-slider-hint">${d.hint}</div>`;
      grid.appendChild(div);
      div.querySelector(`#fc-rng-${d.key}`).addEventListener("input",e=>{
        state.factors[d.key]=Number(e.target.value);
        $(`fc-sv-${d.key}`).textContent=e.target.value;
        drawForecast();
      });
    });
  }

  /* ── Factor names/explains/news ── */
  const fNames={demand:"需求动能",opec:"OPEC+供给",inventory:"美国库存",usd:"美元指数",shipping:"航运紧张(BDTI)",geo:"地缘风险",volatility:"波动(地缘)"};
  const fExplains={
    demand:"需求动能上行通常抬升价格中枢，并提升上行尾部概率（消费、炼厂开工、航空出行等共同驱动）。",
    opec:"OPEC+供给策略影响市场紧缺程度：减产/延长自愿减产会抬升风险溢价；增产则缓解紧张。",
    inventory:"美国原油与成品油库存变化反映短期供需平衡；库存超预期上升通常偏空，下降偏多。",
    usd:"美元走强往往压制以美元计价的大宗商品（融资成本与定价效应），反之亦然。",
    shipping:"航运紧张意味着物流摩擦/成本上升，可能通过「运输瓶颈+风险溢价」推升价格与波动。",
    geo:"地缘风险通常不改变长期供需，但会显著放大不确定性（尾部风险）并加宽预测区间。",
    volatility:"波动因子用于刻画不确定性与尾部风险：地缘、金融条件、流动性变化都会抬升波动。"
  };
  const fNews={
    demand:[{title:"全球炼厂开工率回升，需求预期上调",src:"Research",date:"2025-11-08"},{title:"航空出行旺季推升成品油裂解价差",src:"Market",date:"2025-12-02"}],
    opec:[{title:"OPEC+会议释放产量指引信号",src:"EIA/Media",date:"2025-10-05"},{title:"主要产油国表态：将视库存调整策略",src:"Macro",date:"2025-10-18"}],
    inventory:[{title:"美国商业库存意外下降，短端价格走强",src:"EIA",date:"2025-09-27"},{title:"成品油库存累积，裂解价差承压",src:"Market",date:"2025-10-12"}],
    usd:[{title:"美元走强抑制大宗商品风险偏好",src:"Macro",date:"2025-08-21"},{title:"美债收益率上行，商品资金流出加速",src:"Rates",date:"2025-09-03"}],
    shipping:[{title:"航线扰动抬升运价指数，物流成本攀升",src:"Shipping",date:"2025-07-19"},{title:"港口拥堵缓解，运价回落但波动仍高",src:"Shipping",date:"2025-08-02"}],
    geo:[{title:"地缘紧张升级，市场风险溢价迅速抬升",src:"Geo",date:"2025-06-15"},{title:"关键通道扰动引发短线波动加剧",src:"Geo",date:"2025-06-28"}],
    volatility:[{title:"隐含波动率抬升，期权保护需求增强",src:"Derivatives",date:"2025-11-22"},{title:"流动性收缩导致尾部风险再定价",src:"Risk",date:"2025-12-10"}],
  };

  function getStableFactorProfile(){
    const profile=state.asset==="brent"
      ? {demand:.19,shipping:.15,opec:.18,inventory:-.13,usd:-.10,geo:.13,volatility:.12}
      : {demand:.22,shipping:.11,opec:.17,inventory:-.16,usd:-.11,geo:.10,volatility:.11};
    const horizonAdj=state.horizon<=7
      ? {shipping:.01,geo:.02,volatility:.03,inventory:-.01}
      : state.horizon<=14
        ? {demand:.01,opec:.01,inventory:-.01,volatility:.01}
        : {demand:.02,opec:.02,inventory:-.02,geo:-.01,volatility:-.01};
    const modelAdj=state.model==="ap"
      ? {demand:.01,inventory:-.01}
      : state.model==="stacking"
        ? {shipping:.01,geo:.01}
        : state.model==="lstm"
          ? {volatility:.01,geo:.01}
          : state.model==="prophet"
            ? {inventory:-.01,usd:-.01}
            : {};
    [horizonAdj,modelAdj].forEach(adj=>{
      Object.keys(adj).forEach(key=>{
        profile[key]=(profile[key]||0)+adj[key];
      });
    });
    return profile;
  }

  function getContrib(){
    const profile=getStableFactorProfile();
    const seedBase=(state.asset==="brent"?17:11)+(state.horizon*3)+({ap:19,stacking:23,lstm:29,prophet:31}[state.model]||13);
    const raw=Object.keys(profile).map((k,idx)=>({
      key:k,
      val:profile[k]+seededNoise(seedBase+idx,59)*.004
    }));
    const sumAbs=raw.reduce((s,x)=>s+Math.abs(x.val),0)||1;
    return raw
      .map(x=>({key:x.key,name:fNames[x.key]||x.key,val:x.val/sumAbs}))
      .sort((a,b)=>Math.abs(b.val)-Math.abs(a.val))
      .slice(0,7);
  }

  let popTimer=null;
  const pop=$("fc-popover");
  function openPop(key,anchor){
    clearTimeout(popTimer);
    $("fc-pop-title").textContent=fNames[key]||key;
    $("fc-pop-sub").textContent=`${getForecastAssetLabel()} · T+${state.horizon} · ${getForecastModelLabel()}`;
    $("fc-pop-explain").textContent=fExplains[key]||"该因子通过供需/风险溢价通道影响价格。";
    $("fc-pop-detail").href=`#factor=${encodeURIComponent(key)}`;
    $("fc-pop-morenews").href=`#news=${encodeURIComponent(key)}`;
    const news=fNews[key]||[];
    $("fc-pop-news").innerHTML=news.length?news.slice(0,2).map(n=>`<div class="fc-news-item"><a href="#" target="_blank">${n.title}</a><div class="fc-news-meta"><span>${n.src}</span><span>${n.date}</span></div></div>`).join(""):`<div class="fc-pop-text">暂无新闻（Demo）</div>`;
    const r=anchor.getBoundingClientRect(),gap=10,pw=340,ph=320;
    let left=r.right+gap,top=r.top-10;
    if(left+pw>window.innerWidth-10)left=r.left-pw-gap;
    left=clamp(left,10,window.innerWidth-pw-10);top=clamp(top,10,window.innerHeight-ph-10);
    pop.style.left=left+"px";pop.style.top=top+"px";pop.style.display="block";
  }
  function schedulePopClose(){clearTimeout(popTimer);popTimer=setTimeout(()=>pop.style.display="none",180);}
  pop.addEventListener("mouseenter",()=>clearTimeout(popTimer));
  pop.addEventListener("mouseleave",()=>schedulePopClose());
  $("fc-pop-close").addEventListener("click",()=>pop.style.display="none");
  document.addEventListener("mousedown",e=>{if(pop.style.display!=="block")return;if(pop.contains(e.target))return;if(e.target&&e.target.classList&&e.target.classList.contains("fc-factor-name"))return;pop.style.display="none";});

  /* ── Factors panel ── */
  function drawFactors(series){
    $("fc-factor-meta").textContent=`${getForecastAssetLabel()} · T+${state.horizon} · ${getForecastModelLabel()}`;
    const contrib=getContrib();
    $("fc-kpi-count").textContent=String(contrib.length);
    const dom=contrib[0];
    $("fc-kpi-top1").textContent=`${dom.name} · ${pct(Math.abs(dom.val))}`;
    $("fc-kpi-dir").textContent=dom.val>=0?"偏多（上行）":"偏空（下行）";
    const mBase=state.model==="ap"?.72:state.model==="stacking"?.68:state.model==="lstm"?.63:state.model==="prophet"?.55:.50;
    const horizonPenalty=state.horizon<=7?0:state.horizon<=14?.03:.06;
    const assetAdj=state.asset==="brent"?.01:0;
    $("fc-kpi-expl").textContent=pct(clamp(mBase-horizonPenalty+assetAdj,.30,.75));

    // Factor board
    const board=$("fc-factor-board");board.innerHTML="";
    const maxAbs=Math.max(...contrib.map(x=>Math.abs(x.val)))||.1;
    contrib.forEach(d=>{
      const isNeg=d.val<0,abs=Math.abs(d.val);
      const w=clamp(abs/maxAbs,0,1)*100;
      const left=isNeg?50-w:50,width=w;
      const row=document.createElement("div");row.className="fc-factor-row";
      row.innerHTML=`<div class="fc-factor-name" data-key="${d.key}" title="悬停查看解释">${d.name}</div>
        <div class="fc-factor-bar"><div class="fc-factor-zero"></div><div class="fc-factor-fill ${isNeg?"neg":""}" style="left:${left}%;width:${width}%"></div></div>
        <div class="fc-factor-val"><span class="fc-factor-sign">${isNeg?"−":"+"}</span>${pct(abs)}</div>`;
      board.appendChild(row);
      row.querySelector(".fc-factor-name").addEventListener("mouseenter",e=>openPop(d.key,e.target));
      row.querySelector(".fc-factor-name").addEventListener("mouseleave",()=>schedulePopClose());
    });

    // Trend explain
    if(!series)series=buildSeries();
    const n=series.hist.length,days=180,si=Math.max(0,n-days);
    const histP=series.hist.slice(si),histD=series.dates.slice(si,si+histP.length);
    const segN=3,segLen=Math.floor(histP.length/segN);
    const segs=[];
    for(let s=0;s<segN;s++){
      const a=s*segLen,b=s===segN-1?histP.length-1:(s+1)*segLen-1;
      const p0=histP[a],p1=histP[b],ret=(p1-p0)/p0,abs=Math.abs(ret);
      let tag="震荡",cls="side",drivers=["地缘风险","波动(地缘)","美国库存"],summary="震荡阶段：多空分歧与事件扰动并存，方向不明但波动上升。";
      if(abs>=.02){if(ret>0){tag="上升";cls="up";drivers=["需求动能","OPEC+供给","航运紧张(BDTI)"];summary="价格上行：需求与供给约束共同抬升价格中枢；风险溢价对尾部贡献更大。";}else{tag="下跌";cls="down";drivers=["美国库存","美元指数","需求动能"];summary="价格回撤：库存/美元等偏空因子主导；资金面变化放大短端波动。";}}
      if(s===1){drivers=[drivers[1],drivers[2],drivers[0]];}
      if(s===2){drivers=[drivers[2],drivers[0],drivers[1]];}
      segs.push({from:histD[a],to:histD[b],ret,tag,cls,drivers,summary});
    }
    const tl=$("fc-trend-list");tl.innerHTML=segs.map(s=>`
      <div class="fc-trend-item">
        <div class="fc-trend-top">
          <div class="fc-trend-range">${fmtDate(s.from)} ~ ${fmtDate(s.to)}</div>
          <div class="fc-trend-tag ${s.cls}">${s.tag} · ${(s.ret*100).toFixed(1)}%</div>
        </div>
        <div style="font-size:11px;font-weight:800;color:var(--fc-text);margin-bottom:4px">主要解释因子</div>
        <div class="fc-chip-row">${s.drivers.map(d=>`<span class="fc-chip">${d}<small>主导</small></span>`).join("")}</div>
        <div class="fc-trend-summary">${s.summary}</div>
      </div>`).join("");

    // Timeline
    const events=[
      {date:"2025-01-10",type:"supply",label:"供给",title:"美国宣布对俄罗斯能源部门、油轮和贸易网络实施新一轮严厉制裁",desc:"对原油供给形成收紧预期，市场担忧俄油出口受阻，推动国际油价与风险溢价上行。"},
      {date:"2025-02-03",type:"macro",label:"宏观",title:"美国推进对加拿大、墨西哥、中国商品加征关税，其中加拿大能源进口被征收10%关税",desc:"对原油的宏观预期转弱，市场开始交易贸易摩擦拖累全球增长和石油需求的风险。"},
      {date:"2025-03-03",type:"supply",label:"供给",title:"OPEC+决定按原计划自4月开始小幅增产，首轮增量约13.8万桶/日",desc:"对原油供给的释放预期启动，市场定价开始从“供应偏紧”转向“增供是否压价”。"},
      {date:"2025-03-04",type:"supply",label:"供给",title:"美国要求雪佛龙在30天内结束其在委内瑞拉的原油出口和相关业务",desc:"对原油供给形成边际收紧预期，委内瑞拉重质原油出口与美国炼厂原料来源面临扰动。"},
      {date:"2025-04-03",type:"supply",label:"供给",title:"OPEC+意外将5月增产规模提高到41.1万桶/日，显著高于市场此前预期",desc:"对原油供给宽松预期明显强化，油价出现阶段性下跌，市场转向交易“份额竞争”逻辑。"},
      {date:"2025-06-13",type:"geo",label:"地缘",title:"以色列与伊朗互相发动空袭，中东局势骤然升级，国际油价当日大涨约7%",desc:"对原油地缘风险溢价形成快速抬升，市场集中交易中东供应中断与航运受扰风险。"},
      {date:"2025-07-05",type:"supply",label:"供给",title:"OPEC+决定8月再增产54.8万桶/日，增产节奏继续加快",desc:"对原油供给进一步宽松，表明产油国更重视夺回市场份额而非单纯托价。"},
      {date:"2025-08-03",type:"supply",label:"供给",title:"OPEC+决定9月再增产54.7万桶/日，市场对潜在过剩的担忧继续升温",desc:"对原油供给过剩预期进一步强化，油价承压下行，市场更关注需求疲弱与库存累积。"},
      {date:"2025-09-07",type:"supply",label:"供给",title:"OPEC+决定自10月起进一步增产13.7万桶/日，并继续推进减产回补",desc:"对原油供给恢复的确定性增强，确认2025年下半年油市主线已转向增供与份额竞争。"},
      {date:"2025-10-20",type:"spread",label:"价差",title:"Brent收于61.01美元/桶、WTI收于57.52美元/桶，市场结构转入contango并交易供应过剩",desc:"对原油价差形成明显影响，近远月价差走弱反映库存压力与供给过剩预期升温。"},
      {date:"2025-11-30",type:"supply",label:"供给",title:"OPEC+决定2026年一季度维持产量不变，暂停进一步增产",desc:"对原油供给形成阶段性托底，说明产油国开始正视过剩压力并放缓增供节奏。"},
      {date:"2025-12-10",type:"spread",label:"价差",title:"亚洲买家要求委内瑞拉原油进一步深度折价，因俄伊受制裁原油大量流入亚洲市场",desc:"对原油价差造成挤压，重质受制裁原油之间的替代与竞争使委内瑞拉原油折价显著扩大。"},
      {date:"2025-12-18",type:"freight",label:"运价",title:"美国制裁29艘运输伊朗石油的“影子船队”船只及其管理公司",desc:"对原油运价与运输风险形成抬升，受制裁油流的航运、保险与转运成本上升。"},
      {date:"2026-01-06",type:"supply",label:"供给",title:"美国与委内瑞拉达成协议，允许最多20亿美元委内瑞拉原油转运美国",desc:"对原油供给预期形成边际修复，部分重质原油将回流美国市场并缓解区域炼厂原料紧张。"},
    ];
    $("fc-timeline").innerHTML=events.map(e=>`
      <div class="fc-event-card">
        <div class="fc-event-top"><div class="fc-event-date">${e.date}</div><div class="fc-etype ${e.type}">${e.label || e.type.toUpperCase()}</div></div>
        <div class="fc-event-title">${e.title}</div>
        <div class="fc-event-desc">${e.desc}</div>
      </div>`).join("");
  }

  /* ── Backtest ── */
  function drawBacktest(series){
    const asset=state.asset==="brent"?"Brent":"WTI";
    $("fc-bt-mse")&&($("fc-bt-mse").textContent="—");
    const n=60,base=state.asset==="brent"?84:81;
    const actual=[],pred=[];
    for(let i=0;i<n;i++){
      const cyc=Math.sin(i/9)*.7+Math.sin(i/21)*.4;
      const drift=i*(state.asset==="brent"?.01:.008);
      const noise=seededNoise(i,state.asset==="brent"?31:37)*.55;
      const a=base+drift+cyc+noise;actual.push(a);
      const mN=state.model==="ap"?.32:state.model==="stacking"?.35:state.model==="lstm"?.45:state.model==="prophet"?.60:.70;
      const bias=(state.horizon/30)*.25*seededNoise(i,41);
      const fac=state.factors.demand*.02+state.factors.shipping*.015-state.factors.usd*.012;
      pred.push(a+seededNoise(i,47)*mN+bias+fac);
    }
    const w=(state.asset==="brent"?1.0:.95)*(.9+state.horizon/30*.9)*(1+Math.abs(state.factors.geo)/10*.8);
    const lo80=pred.map((p,i)=>p-1.28*w*(.6+i/n*.5));
    const hi80=pred.map((p,i)=>p+1.28*w*(.6+i/n*.5));
    let dirOK=0,mse=0,cov80=0,cov95=0;
    const lo95=pred.map((p,i)=>p-1.96*w*(.6+i/n*.5));
    const hi95=pred.map((p,i)=>p+1.96*w*(.6+i/n*.5));
    for(let i=1;i<n;i++){
      const da=actual[i]-actual[i-1],dp=pred[i]-pred[i-1];
      if((da>=0&&dp>=0)||(da<0&&dp<0))dirOK++;
      mse+=(pred[i]-actual[i])**2;
      if(actual[i]>=lo80[i]&&actual[i]<=hi80[i])cov80++;
      if(actual[i]>=lo95[i]&&actual[i]<=hi95[i])cov95++;
    }
    const acc=dirOK/(n-1);
    mse=mse/(n-1);cov80=cov80/n;cov95=cov95/n;
    $("fc-bt-acc").textContent=pct(acc);
    $("fc-bt-cov80").textContent=pct(cov80);
    $("fc-bt-cov95").textContent=pct(cov95);
    $("fc-bt-mse").textContent=mse.toFixed(3);

    // Matrix
    const baseN=240,noise2=clamp(Math.abs(state.factors.geo)/10,0,1);
    const good=clamp(acc-.05+.03*(1-noise2),.35,.85);
    const rL=Math.round(baseN*.33),rM=Math.round(baseN*.44),rH=baseN-rL-rM;
    function splitRow(rn,d){const di=Math.round(rn*d),rest=rn-di,a=Math.round(rest*.55);return[di,a,rest-a];}
    const sL=splitRow(rL,.62+(good-.5)*.3),sM=splitRow(rM,clamp(.58+(good-.5)*.3,.45,.85)),sH=splitRow(rH,.60+(good-.5)*.3);
    const m=[[sL[0],sL[1],sL[2]],[sM[1],sM[0],sM[2]],[sH[2],sH[1],sH[0]]];
    $("fc-bt-matrix").innerHTML=`<tr><th>低</th><td>${m[0][0]}</td><td>${m[0][1]}</td><td>${m[0][2]}</td></tr><tr><th>中</th><td>${m[1][0]}</td><td>${m[1][1]}</td><td>${m[1][2]}</td></tr><tr><th>高</th><td>${m[2][0]}</td><td>${m[2][1]}</td><td>${m[2][2]}</td></tr>`;
    $("fc-bt-matrix-note").textContent="矩阵反映真实区间与预测区间的落点分布，对角线越集中，说明分级识别越稳定。";

    // Backtest chart
    const svg=$("fc-bt-chart");svg.innerHTML="";
    const all=actual.concat(pred).concat(lo80).concat(hi80);
    const mn=Math.min(...all)-2.5,mx=Math.max(...all)+2.5;
    const W=1100,H=460,pL=48,pR=16,pT=20,pB=36,plotW=W-pL-pR,plotH=H-pT-pB;
    const bx=i=>pL+(i/(n-1))*plotW,by=v=>pT+(1-(v-mn)/(mx-mn))*plotH;
    for(let i=0;i<=4;i++){const yy=pT+(i/4)*plotH;svg.appendChild(svgEl("line",{x1:pL,x2:W-pR,y1:yy,y2:yy,stroke:"rgba(255,255,255,.05)","stroke-width":"1"}));}
    // Band
    const xsA=Array.from({length:n},(_,i)=>bx(i));
    const bandPts=xsA.map((x,i)=>[x,by(hi80[i])]).concat(xsA.slice().reverse().map((x,i)=>[x,by(lo80[n-1-i])]));
    svg.appendChild(svgEl("path",{d:bandPts.map((p,i)=>(i===0?"M":"L")+p[0].toFixed(2)+" "+p[1].toFixed(2)).join(" ")+"Z",fill:"rgba(216,179,106,.14)",stroke:"rgba(216,179,106,.18)","stroke-width":"1"}));
    svg.appendChild(svgEl("path",{d:pathD(xsA,actual.map(v=>by(v))),fill:"none",stroke:"rgba(111,208,255,.85)","stroke-width":"2"}));
    svg.appendChild(svgEl("path",{d:pathD(xsA,pred.map(v=>by(v))),fill:"none",stroke:"rgba(216,179,106,.85)","stroke-width":"2","stroke-dasharray":"8 5"}));
  }

  /* ── Tab switching ── */
  document.querySelectorAll(".fc-tab").forEach(btn=>{
    btn.addEventListener("click",()=>{
      document.querySelectorAll(".fc-tab").forEach(t=>t.classList.remove("active"));
      document.querySelectorAll(".fc-panel").forEach(p=>p.classList.remove("active"));
      btn.classList.add("active");
      const tab=btn.dataset.tab;
      $(`fc-panel-${tab}`).classList.add("active");
    });
  });

  /* ── Chart interactions ── */
  let dragging=false,dragStartX=0,dragStartVS=0;
  $("fc-chart-wrap").addEventListener("wheel",e=>{
    e.preventDefault();
    const series=buildSeries();const total=series.combined.length;
    const plotRect=getForecastPlotRect();
    const relX=clamp((e.clientX-plotRect.left)/plotRect.width,0,1);
    const anchor=state.viewStart+Math.round(relX*(state.viewCount-1));
    const factor=e.deltaY<0?.87:1.15;
    const newCount=clamp(Math.round(state.viewCount*factor),60,Math.min(300,total));
    let newStart=Math.round(anchor-relX*(newCount-1));
    newStart=clamp(newStart,0,Math.max(0,total-newCount));
    state.viewCount=newCount;state.viewStart=newStart;
    drawForecast();
  },{passive:false});
  $("fc-chart-wrap").addEventListener("pointerdown",e=>{dragging=true;dragStartX=e.clientX;dragStartVS=state.viewStart;$("fc-chart-wrap").setPointerCapture(e.pointerId);$("fc-chart-wrap").style.cursor="grabbing";});
  $("fc-chart-wrap").addEventListener("pointermove",e=>{
    if(!dragging)return;
    const series=buildSeries();const total=series.combined.length;
    const plotRect=getForecastPlotRect();
    const shift=Math.round(-(e.clientX-dragStartX)/plotRect.width*state.viewCount);
    state.viewStart=clamp(dragStartVS+shift,0,Math.max(0,total-state.viewCount));
    drawForecast();
  });
  function endDrag(e){if(!dragging)return;dragging=false;$("fc-chart-wrap").style.cursor="crosshair";try{$("fc-chart-wrap").releasePointerCapture(e.pointerId);}catch{}}
  $("fc-chart-wrap").addEventListener("pointerup",endDrag);
  $("fc-chart-wrap").addEventListener("pointercancel",endDrag);
  $("fc-chart-wrap").addEventListener("dblclick",()=>{resetView(buildSeries().combined.length);drawForecast();});

  function syncForecastPanelLayout(){
    const mainGrid=document.querySelector("#fc-panel-forecast .fc-main-grid");
    const cols=mainGrid?Array.from(mainGrid.children).filter(el=>el&&el.tagName==="DIV"):[];
    const leftCol=cols[0];
    const rightCol=cols[1];
    if(leftCol) leftCol.classList.add("fc-forecast-side-stack");
    if(rightCol) rightCol.classList.add("fc-forecast-side-stack");

    const consensusCard=rightCol?rightCol.querySelector(".fc-card"):null;
    const consensusNote=consensusCard?consensusCard.querySelector(".fc-note"):null;
    if(consensusNote) consensusNote.remove();

    const impactGrid=$("fc-impact-grid");
    const impactCard=impactGrid&&impactGrid.closest?impactGrid.closest(".fc-card"):null;
    if(rightCol&&impactCard&&impactCard.parentElement!==rightCol){
      rightCol.appendChild(impactCard);
    }

    const scenarioGrid=document.querySelector("#fc-panel-forecast .fc-scenario-grid");
    if(scenarioGrid){
      const scenarioCard=scenarioGrid.querySelector(":scope > .fc-card");
      if(leftCol&&scenarioCard&&scenarioCard.parentElement!==leftCol){
        leftCol.appendChild(scenarioCard);
      }
      if(!scenarioGrid.querySelector(":scope > .fc-card")) scenarioGrid.remove();
      else scenarioGrid.classList.add("fc-solo");
    }
  }
  function syncForecastShellLayout(){
    const riskBadge=$("fc-risk-badge-hero");
    const chartMeta=document.querySelector("#fc-panel-forecast .fc-card-head .fc-card-meta");
    if(riskBadge&&chartMeta&&riskBadge.parentElement!==chartMeta){
      const oldWrap=riskBadge.parentElement;
      chartMeta.prepend(riskBadge);
      if(oldWrap&&!oldWrap.children.length)oldWrap.remove();
    }

    const toolbar=document.querySelector("#fc-panel-forecast .fc-toolbar");
    const modelControl=$("fc-model")?.closest(".fc-control");
    const alertBtn=$("fc-btn-alert");
    const alertWrap=alertBtn?alertBtn.parentElement:null;
    const exportBtn=$("fc-btn-export");
    if(toolbar&&modelControl){
      let actions=toolbar.querySelector(".fc-toolbar-actions");
      if(!actions){
        actions=document.createElement("div");
        actions.className="fc-toolbar-actions";
        modelControl.insertAdjacentElement("afterend",actions);
      }
      if(alertWrap&&alertWrap.parentElement!==actions)actions.appendChild(alertWrap);
      if(exportBtn&&exportBtn.parentElement!==actions)actions.appendChild(exportBtn);
    }

    const resetBtn=$("fc-btn-reset");
    if(resetBtn)resetBtn.remove();

    const scenarioPill=document.querySelector("#fc-panel-forecast .fc-scenario-grid .fc-card .fc-card-head .fc-pill");
    if(scenarioPill)scenarioPill.remove();
  }
  syncForecastShellLayout();

  /* ── Control bindings ── */
  $("fc-asset").addEventListener("change",e=>{state.asset=e.target.value;resetView(buildSeries().combined.length);drawForecast();});
  $("fc-horizon").addEventListener("change",e=>{state.horizon=Number(e.target.value);resetView(buildSeries().combined.length);drawForecast();});
  $("fc-model").addEventListener("change",e=>{state.model=e.target.value;drawForecast();});
  const resetBtn=$("fc-btn-reset");
  if(resetBtn)resetBtn.addEventListener("click",()=>{
    state.asset="wti";state.horizon=1;state.model="ap";
    Object.keys(state.factors).forEach(k=>state.factors[k]=0);
    $("fc-asset").value="wti";$("fc-horizon").value="1";$("fc-model").value="ap";
    sliderDefs.forEach(d=>{const r=$(`fc-rng-${d.key}`),v=$(`fc-sv-${d.key}`);if(r)r.value=0;if(v)v.textContent="0";});
    resetView(buildSeries().combined.length);pop.style.display="none";
    drawForecast();toast("已重置");
  });
  $("fc-btn-export").addEventListener("click",()=>{
    const svg=$("fc-chart");const blob=new Blob([new XMLSerializer().serializeToString(svg)],{type:"image/svg+xml"});
    const url=URL.createObjectURL(blob);const a=document.createElement("a");a.href=url;a.download="forecast.svg";document.body.appendChild(a);a.click();a.remove();URL.revokeObjectURL(url);
  });

  // Alert panel
  const alertPanel=$("fc-alert-panel");
  const alertBtn=$("fc-btn-alert");
  const alertCheckIds=["al_price_on","al_boll_on","al_outside_on","al_risk_jump","al_vol_spike","al_factor_jump"];
  const alertInputIds=["al_price_level","al_vol_level","al_factor_level"];
  const captureAlertState=()=>({
    checks:Object.fromEntries(alertCheckIds.map(id=>[id, !!($(id)&&$(id).checked)])),
    inputs:Object.fromEntries(alertInputIds.map(id=>[id, $(id)?$(id).value:""]))
  });
  const applyAlertState=state=>{
    if(!state)return;
    alertCheckIds.forEach(id=>{const el=$(id);if(el)el.checked=!!(state.checks&&state.checks[id]);});
    alertInputIds.forEach(id=>{const el=$(id);if(el)el.value=state.inputs&&typeof state.inputs[id]!=="undefined"?state.inputs[id]:"";});
  };
  const blankAlertState=()=>({
    checks:Object.fromEntries(alertCheckIds.map(id=>[id,false])),
    inputs:Object.fromEntries(alertInputIds.map(id=>[id,""]))
  });
  let savedAlertState=captureAlertState();
  const closeAlertPanel=(revert=true)=>{
    if(revert) applyAlertState(savedAlertState);
    alertPanel.classList.remove("show");
  };
  alertBtn.addEventListener("click",e=>{
    e.stopPropagation();
    if(alertPanel.classList.contains("show")) closeAlertPanel(true);
    else{
      applyAlertState(savedAlertState);
      alertPanel.classList.add("show");
    }
  });
  $("fc-alert-close").addEventListener("click",()=>closeAlertPanel(true));
  $("fc-alert-save").addEventListener("click",()=>{
    savedAlertState=captureAlertState();
    alertPanel.classList.remove("show");
    toast("预警设置已确认");
  });
  $("fc-alert-reset").addEventListener("click",()=>{
    applyAlertState(blankAlertState());
    toast("已清空当前设置");
  });
  document.addEventListener("mousedown",e=>{
    if(alertPanel.classList.contains("show")&&!alertPanel.contains(e.target)&&e.target!==alertBtn) closeAlertPanel(true);
  });
  if(themeBtn && themeBtn.dataset.themeBound!=="1"){
    themeBtn.addEventListener("click",()=>{
      const next=fcIsLight()?"dark":"light";
      applyForecastTheme(next);
      try{ localStorage.setItem(FC_THEME_KEY,next); }catch{}
      drawForecast();
    });
    themeBtn.dataset.themeBound="1";
  }

  /* ── Init render ── */
  applyForecastTheme(readStoredTheme());
  syncForecastPanelLayout();
  renderConsensus();
  renderSliders();
  renderImpactGrid();
  resetView(buildSeries().combined.length);
  drawForecast();
}
/* ══════════════════════════════════════════════════════
   DATABASE VIEW — JS
══════════════════════════════════════════════════════ */
(()=>{
  /* ── 工具函数 ── */
  function dbGenKline(days){
    const data=[]; let price=65;
    for(let i=days;i>=0;i--){
      const d=new Date(); d.setDate(d.getDate()-i);
      const ds=`${d.getFullYear()}-${String(d.getMonth()+1).padStart(2,'0')}-${String(d.getDate()).padStart(2,'0')}`;
      const chg=(Math.random()-.48)*2.5;
      const open=price; price+=chg; const close=price;
      const high=Math.max(open,close)+Math.random()*.5;
      const low=Math.min(open,close)-Math.random()*.5;
      data.push({date:ds,open:+open.toFixed(2),close:+close.toFixed(2),high:+high.toFixed(2),low:+low.toFixed(2),vol:Math.floor(Math.random()*200000+150000)});
    }
    return data;
  }
  function dbCalcMA(data,n){
    return data.map((_,i)=>{
      if(i<n-1)return[data[i][0],null];
      const s=data.slice(i-n+1,i+1).reduce((a,v)=>a+v[2],0);
      return[data[i][0],+(s/n).toFixed(2)];
    });
  }
  function dbGenMock(start,end,base){
    const data=[]; const bases={brent:75,wti:72,shanghai:70,'wti-crack':15,'ice-diesel':22};
    const bp=bases[base]||50;
    for(let d=new Date(start);d<=new Date(end);d.setDate(d.getDate()+1)){
      const p=bp+(Math.random()-.5)*4;
      data.push({date:d.toISOString().split('T')[0],price:+p.toFixed(2)});
    }
    return data;
  }

  /* ── 成品油切换 ── */
  window.dbShowProduct=function(type){
    document.querySelectorAll('#view-database .db-product-tbl').forEach(t=>t.style.display='none');
    const el=document.getElementById('db-'+type);
    if(el) el.style.display='block';
  };

  /* ── K线图 ── */
  let dbKChart=null, dbKProduct='wti';
  function dbRenderKline(product){
    const wrap=document.getElementById('dbKLineChart');
    if(!wrap) return;
    if(!dbKChart) dbKChart=echarts.init(wrap);
    const raw=dbGenKline(365);
    const mult={brent:1,wti:.95,china:.85,future1:1.05,future2:1.1,future3:1.15}[product]||1;
    const kd=raw.map(r=>[new Date(r.date).getTime(),+(r.open*mult).toFixed(2),+(r.close*mult).toFixed(2),+(r.low*mult).toFixed(2),+(r.high*mult).toFixed(2),r.vol]);
    const ma5=dbCalcMA(kd,5), ma20=dbCalcMA(kd,20);
    dbKChart.setOption({
      animation:false, backgroundColor:'#000',
      tooltip:{trigger:'axis',axisPointer:{type:'cross'},borderColor:'#d4af37',backgroundColor:'rgba(42,42,42,.9)',textStyle:{color:'#d4af37'},
        formatter(p){const d=p[0].data,dt=new Date(d[0]);return`日期:${dt.toISOString().slice(0,10)}<br>开:${d[1]} 收:${d[2]}<br>低:${d[3]} 高:${d[4]}<br>量:${d[5]}`;}},
      legend:{data:['K线','MA5','MA20'],textStyle:{color:'#d4af37',fontFamily:'"Noto Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif'},right:'5%',top:'2%'},
      grid:{left:'3%',right:'3%',bottom:'5%',top:'15%',containLabel:true},
      xAxis:{type:'time',scale:true,axisLine:{lineStyle:{color:'#444'}},splitLine:{show:false},axisLabel:{color:'#888',formatter(v){const d=new Date(v);return(d.getMonth()+1)+'/'+d.getDate();}}},
      yAxis:{scale:true,axisLine:{lineStyle:{color:'#444'}},splitLine:{lineStyle:{color:'rgba(255,255,255,.06)',type:'dashed'}},axisLabel:{color:'#888'}},
      dataZoom:[{type:'inside',start:50,end:100}],
      series:[
        {name:'K线',type:'candlestick',data:kd,itemStyle:{color:'#ef232a',color0:'#14b143',borderColor:'#ef232a',borderColor0:'#14b143'}},
        {name:'MA5',type:'line',data:ma5,smooth:true,lineStyle:{width:1,color:'#d4af37'},symbol:'none'},
        {name:'MA20',type:'line',data:ma20,smooth:true,lineStyle:{width:1,color:'#daa520'},symbol:'none'}
      ]
    });
  }
  window.dbChangeProduct=function(p){ dbKProduct=p; dbRenderKline(p); };

  /* ── K线图全屏 ── */
  window.dbFullscreenKLine = function(){
    const el = document.getElementById('db-k-line');
    if(!document.fullscreenElement){ el.requestFullscreen && el.requestFullscreen(); }
    else { document.exitFullscreen && document.exitFullscreen(); }
  };

  /* ── 供需图表 ── */
  let dbOpecChart=null, dbDemandChart=null;
  function dbRenderSupply(){
    const opecEl=document.getElementById('dbOpecPie');
    const demEl=document.getElementById('dbDemandBar');
    if(!opecEl||!demEl) return;
    if(!dbOpecChart) dbOpecChart=echarts.init(opecEl);
    if(!dbDemandChart) dbDemandChart=echarts.init(demEl);
    /*
    dbOpecChart.setOption({
      tooltip:{trigger:'item',formatter:'{b}: {c}千桶/日 ({d}%)',textStyle:{color:'#d4af37'}},
      legend:{orient:'horizontal',bottom:1,textStyle:{color:'#d4af37',fontSize:8},itemWidth:6,itemHeight:6,itemGap:2},
      series:[{name:'欧佩克产量',type:'pie',radius:['25%','50%'],center:['50%','42%'],
        label:{show:true,formatter:'{b}',color:'#d4af37',fontSize:10},
        labelLine:{lineStyle:{color:'#d4af37'}},
        itemStyle:{borderRadius:5,borderColor:'#1a1a1a',borderWidth:2},
        data:[
  {value:2641, name:'沙特阿拉伯', itemStyle:{color:'#d4af37'}},
  {value:1680, name:'伊拉克',     itemStyle:{color:'#c49a28'}},
  {value:1402, name:'阿联酋',     itemStyle:{color:'#b08520'}},
  {value:1320, name:'科威特',     itemStyle:{color:'#9a7015'}},
  {value:1100, name:'伊朗',       itemStyle:{color:'#876010'}},
  {value:880,  name:'尼日利亚',   itemStyle:{color:'#755010'}},
  {value:720,  name:'安哥拉',     itemStyle:{color:'#634010'}},
  {value:650,  name:'刚果',       itemStyle:{color:'#523510'}},
  {value:580,  name:'加蓬',       itemStyle:{color:'#412a0c'}},
  {value:520,  name:'赤道几内亚', itemStyle:{color:'#2e1e08'}},
]
    });
    dbDemandChart.setOption({
      tooltip:{trigger:'axis',axisPointer:{type:'shadow'},textStyle:{color:'#d4af37'},formatter:'{b}: {c}百万桶/日'},
      grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},
      xAxis:{type:'category',data:['2026Q3','2026Q4','2027Q1','2027Q2','2027Q3','2027Q4'],axisLine:{lineStyle:{color:'#d4af37'}},axisLabel:{color:'#d4af37',fontSize:10}},
      yAxis:{type:'value',name:'百万桶/日',nameTextStyle:{color:'#d4af37',fontSize:10},axisLine:{lineStyle:{color:'#d4af37'}},axisLabel:{color:'#d4af37',fontSize:10},splitLine:{lineStyle:{color:'#444'}}},
      series:[{type:'bar',barWidth:'50%',data:[103.5,104.2,105.0,105.8,104.8,106.2],
        itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#d4af37'},{offset:1,color:'#8a7015'}]),borderRadius:[5,5,0,0]},
        label:{show:true,position:'top',color:'#d4af37',fontSize:11}}]
    });
  }

  /* ── 自定义弹窗 ── */
    dbOpecChart.setOption({
      tooltip:{trigger:'item',formatter:'{b}: {c} kb/d ({d}%)',textStyle:{color:'#d4af37'}},
      legend:{orient:'horizontal',bottom:1,textStyle:{color:'#d4af37',fontSize:8},itemWidth:6,itemHeight:6,itemGap:2},
      series:[{
        name:'OPEC Output',
        type:'pie',
        radius:['25%','50%'],
        center:['50%','42%'],
        label:{show:true,formatter:'{b}',color:'#d4af37',fontSize:10},
        labelLine:{lineStyle:{color:'#d4af37'}},
        itemStyle:{borderRadius:5,borderColor:'#1a1a1a',borderWidth:2},
        data:[
          {value:2641,name:'Saudi Arabia',itemStyle:{color:'#d4af37'}},
          {value:1680,name:'Iraq',itemStyle:{color:'#c49a28'}},
          {value:1402,name:'UAE',itemStyle:{color:'#b08520'}},
          {value:1320,name:'Kuwait',itemStyle:{color:'#9a7015'}},
          {value:1100,name:'Iran',itemStyle:{color:'#876010'}},
          {value:880,name:'Nigeria',itemStyle:{color:'#755010'}},
          {value:720,name:'Angola',itemStyle:{color:'#634010'}},
          {value:650,name:'Congo',itemStyle:{color:'#523510'}},
          {value:580,name:'Gabon',itemStyle:{color:'#412a0c'}},
          {value:520,name:'Equatorial Guinea',itemStyle:{color:'#2e1e08'}},
        ],
      }],
    });
    dbDemandChart.setOption({
      tooltip:{trigger:'axis',axisPointer:{type:'shadow'},textStyle:{color:'#d4af37'},formatter:'{b}: {c} mb/d'},
      grid:{left:'3%',right:'4%',bottom:'3%',top:'8%',containLabel:true},
      xAxis:{type:'category',data:['2026Q3','2026Q4','2027Q1','2027Q2','2027Q3','2027Q4'],axisLine:{lineStyle:{color:'#d4af37'}},axisLabel:{color:'#d4af37',fontSize:10}},
      yAxis:{type:'value',name:'mb/d',nameTextStyle:{color:'#d4af37',fontSize:10},axisLine:{lineStyle:{color:'#d4af37'}},axisLabel:{color:'#d4af37',fontSize:10},splitLine:{lineStyle:{color:'#444'}}},
      series:[{
        type:'bar',
        barWidth:'50%',
        data:[103.5,104.2,105.0,105.8,104.8,106.2],
        itemStyle:{color:new echarts.graphic.LinearGradient(0,0,0,1,[{offset:0,color:'#d4af37'},{offset:1,color:'#8a7015'}]),borderRadius:[5,5,0,0]},
        label:{show:true,position:'top',color:'#d4af37',fontSize:11},
      }],
    });
  }

  let dbLineChart=null;
  window.dbOpenModal=function(){
    document.getElementById('db-custom-modal').style.display='block';
    document.body.style.overflow='hidden';
  };
  window.dbCloseModal=function(){
    document.getElementById('db-custom-modal').style.display='none';
    document.body.style.overflow='auto';
  };
  document.addEventListener('click',e=>{ if(e.target===document.getElementById('db-custom-modal')) dbCloseModal(); });
  window.dbRenderCustom=function(){
    const s=document.getElementById('db-start-date').value;
    const e=document.getElementById('db-end-date').value;
    const t1=document.getElementById('db-type1');
    const t2=document.getElementById('db-type2');
    const n1=t1.options[t1.selectedIndex].text, n2=t2.options[t2.selectedIndex].text;
    const d1=dbGenMock(s,e,t1.value), d2=dbGenMock(s,e,t2.value);
    const l1=d1[d1.length-1].price, p1=d1[d1.length-2].price;
    const l2=d2[d2.length-1].price, p2=d2[d2.length-2].price;
    const c1=+(l1-p1).toFixed(2), c2=+(l2-p2).toFixed(2);
    document.getElementById('db-modal-tbody').innerHTML=`
      <tr><td>${n1}</td><td>${l1}</td><td class="${c1>=0?'db-pos':'db-neg'}">${c1>=0?'+':''}${c1}</td><td class="${c1>=0?'db-pos':'db-neg'}">${c1>=0?'+':''}${((c1/p1)*100).toFixed(2)}%</td></tr>
      <tr><td>${n2}</td><td>${l2}</td><td class="${c2>=0?'db-pos':'db-neg'}">${c2>=0?'+':''}${c2}</td><td class="${c2>=0?'db-pos':'db-neg'}">${c2>=0?'+':''}${((c2/p2)*100).toFixed(2)}%</td></tr>
      <tr><td>价差</td><td colspan="3">${+(l1-l2).toFixed(2)}</td></tr>`;
    const chartEl=document.getElementById('dbCustomLineChart');
    if(dbLineChart) dbLineChart.dispose();
    dbLineChart=echarts.init(chartEl);
    dbLineChart.setOption({
      tooltip:{trigger:'axis'},
      legend:{data:[n1,n2],textStyle:{color:'#9fb0c7'},bottom:0},
      grid:{left:'3%',right:'4%',bottom:'15%',top:'10%',containLabel:true},
      xAxis:{type:'category',boundaryGap:false,data:d1.map(x=>x.date),axisLabel:{color:'#9fb0c7',fontSize:10},splitLine:{show:false}},
      yAxis:{axisLabel:{color:'#9fb0c7',fontSize:10},splitLine:{lineStyle:{color:'rgba(28,39,53,.5)'}}},
      series:[
        {name:n1,type:'line',data:d1.map(x=>x.price),smooth:true,lineStyle:{color:'#e4b44a',width:2},areaStyle:{color:'rgba(228,180,74,.1)'}},
        {name:n2,type:'line',data:d2.map(x=>x.price),smooth:true,lineStyle:{color:'#6fd0ff',width:2},areaStyle:{color:'rgba(111,208,255,.1)'}}
      ]
    });
  };
  window.dbDownloadChart=function(){
    if(dbLineChart){ const a=document.createElement('a');a.href=dbLineChart.getDataURL({type:'png',pixelRatio:2,backgroundColor:'#0f1620'});a.download='crack-spread.png';a.click(); }
  };

  /* ── 初始化入口（由 switchView 触发，双 rAF 等布局稳定） ── */
  window.dbInitOnce=false;
 window.initDatabaseView=function(){
    if(window.dbInitOnce) return;
    window.dbInitOnce=true;
    dbShowProduct('diesel');
    requestAnimationFrame(()=>{
      requestAnimationFrame(()=>{
        dbRenderKline('brent');
        dbRenderSupply();
        // 新增：强制resize确保宽高正确
        setTimeout(()=>{
          dbKChart?.resize();
          dbOpecChart?.resize();
          dbDemandChart?.resize();
        }, 200);
      });
    });
    window.addEventListener('resize',()=>{
      dbKChart?.resize();
      dbOpecChart?.resize();
      dbDemandChart?.resize();
    });
};
})();      

/* ── 数据库页面内容 ── */
(function(){
  window._loadDbDownload = function(){
    var frame = document.getElementById('db-download-frame');
    if(!frame || frame.dataset.loaded) return;
    frame.src = '0316.html';
    frame.dataset.loaded = '1';
  };
})();
/* ══════════════════════════════════════════
   套保助手 JS（hg_ 前缀避免全局变量冲突）
══════════════════════════════════════════ */
(function(){
  function hgInit(){
    const $=id=>document.getElementById(id);
    const bizItems=document.querySelectorAll('#hgBizGroup .hg-radio-item');
    const consumerItems=document.querySelectorAll('#hgConsumerGroup .hg-radio-item');
    const modelItems=document.querySelectorAll('#hgModelGroup .hg-radio-item');
    if(!bizItems.length) return; // view未激活时跳过

    // 设置默认到期日
    const now=new Date();
    const curMonth=now.getFullYear()+'-'+String(now.getMonth()+1).padStart(2,'0');
    $('hgExpireDate').value=curMonth;
    hgUpdateContract(curMonth);

    function hgToggleRadio(items,clicked){
      items.forEach(i=>i.querySelector('.hg-custom-radio').classList.remove('checked'));
      clicked.querySelector('.hg-custom-radio').classList.add('checked');
      return clicked.dataset.value;
    }
    function hgGetVal(items){let v='';items.forEach(i=>{if(i.querySelector('.hg-custom-radio').classList.contains('checked'))v=i.dataset.value;});return v;}
    function hgUpdateContract(date){
      if(!date)return;
      const[y,m]=date.split('-');
      const code='SC'+y.slice(2)+m;
      $('hgContractTips').textContent='系统匹配合约：'+code;
      $('hgFutCode').textContent=code;
    }
    function hgUpdateHedgeType(biz){$('hgHedgeType').textContent=biz==='采购'?'空头（采购业务）':'多头（销售业务）';}
    function hgUpdateOpenTime(model,consumer){
      $('hgOpenTime').textContent=(model==='均值-方差权衡模型'&&consumer==='激进型')?'建议1个工作日内开仓':'建议3个工作日内或分仓建仓';
    }
    function hgToast(msg){const t=$('hgToast');t.textContent=msg;t.classList.add('show');clearTimeout(hgToast._t);hgToast._t=setTimeout(()=>t.classList.remove('show'),1600);}
    function hgFmt(n){return n.toFixed(2).replace(/\B(?=(\d{3})+(?!\d))/g,',');}

    // 绑定事件
    bizItems.forEach(item=>item.addEventListener('click',()=>{hgUpdateHedgeType(hgToggleRadio(bizItems,item));}));
    consumerItems.forEach(item=>item.addEventListener('click',()=>{hgToggleRadio(consumerItems,item);hgUpdateOpenTime(hgGetVal(modelItems),item.dataset.value);}));
    modelItems.forEach(item=>item.addEventListener('click',()=>{
      const sel=hgToggleRadio(modelItems,item);
      $('hgModelType').textContent=sel;
      $('hgAdvanced').style.display=sel==='均值-方差权衡模型'?'flex':'none';
      hgUpdateOpenTime(sel,hgGetVal(consumerItems));
    }));
    $('hgExpireDate').addEventListener('change',e=>{hgUpdateContract(e.target.value);$('hgExpireDateErr').style.display='none';});
    $('hgSpotQty').addEventListener('input',()=>{
      const v=Number($('hgSpotQty').value.trim());
      $('hgSpotQtyErr').style.display=(isNaN(v)||v<100||v%1!==0)?'block':'none';
    });
    $('hgMaxLoss').addEventListener('input',()=>{
      const v=Number($('hgMaxLoss').value.trim());
      $('hgMaxLossErr').style.display=(isNaN(v)||v<0)?'block':'none';
    });

    function hgCheckForm(){
      let ok=true;
      const qty=Number($('hgSpotQty').value.trim());
      if(isNaN(qty)||qty<100||qty%1!==0){$('hgSpotQtyErr').style.display='block';ok=false;}else{$('hgSpotQtyErr').style.display='none';}
      if(!$('hgExpireDate').value){$('hgExpireDateErr').style.display='block';ok=false;}else{$('hgExpireDateErr').style.display='none';}
      if(hgGetVal(modelItems)==='均值-方差权衡模型'){
        const lv=Number($('hgMaxLoss').value.trim());
        if(isNaN(lv)||lv<0){$('hgMaxLossErr').style.display='block';ok=false;}else{$('hgMaxLossErr').style.display='none';}
      }
      return ok;
    }

    function hgCalc(){
      const biz=hgGetVal(bizItems);
      const qty=Number($('hgSpotQty').value.trim());
      const consumer=hgGetVal(consumerItems);
      const model=hgGetVal(modelItems);
      let ratio=0.856;
      if(consumer==='中立型') ratio=0.856*0.9;
      else if(consumer==='激进型') ratio=0.856*0.8;
      $('hgHedgeRatio').textContent=(ratio*100).toFixed(2)+'%';
      const hands=Math.ceil(ratio*qty/1000);
      $('hgFutQty').textContent=hands+' 手';
      const fp=504,init=fp*1000*hands*0.1,supp=fp*1000*hands*0.08;
      $('hgInitMargin').textContent=hgFmt(init)+' 元';
      $('hgSuppMargin').textContent=hgFmt(supp)+' 元';
      $('hgTotalMargin').textContent=hgFmt(init+supp)+' 元';
      hgUpdateOpenTime(model,consumer);
    }

    $('hgCalcBtn').addEventListener('click',()=>{if(hgCheckForm()){hgCalc();hgToast('套保方案计算成功！');}});
    $('hgResetBtn').addEventListener('click',()=>{
      hgToggleRadio(bizItems,bizItems[0]);hgUpdateHedgeType('采购');
      $('hgSpotQty').value='';$('hgSpotQtyErr').style.display='none';
      $('hgExpireDate').value=curMonth;hgUpdateContract(curMonth);$('hgExpireDateErr').style.display='none';
      hgToggleRadio(consumerItems,consumerItems[0]);
      hgToggleRadio(modelItems,modelItems[0]);$('hgModelType').textContent='最小方差模型';$('hgAdvanced').style.display='none';
      $('hgMaxLoss').value='';$('hgMaxLossErr').style.display='none';
      hgUpdateOpenTime('最小方差模型','稳健型');
    });
  }

  // 首次切换到套保助手时初始化
  const _orig=window.switchView;
  window.switchView=function(viewId){
    _orig(viewId);
    if(viewId==='view-hedge') setTimeout(hgInit,30);
  };
})();
/* ══════════════════════════════════════════
   预警机制 JS（wa_ 前缀避免冲突）
══════════════════════════════════════════ */
(function(){
  const $=id=>document.getElementById(id);

  let waHistoryData=[], waRealTimePrice=0;

  // ── Excel读取 ──
  function waReadExcel(file){
    return new Promise((resolve,reject)=>{
      const reader=new FileReader();
      reader.onload=e=>{
        try{
          const wb=XLSX.read(new Uint8Array(e.target.result),{type:'array'});
          resolve(XLSX.utils.sheet_to_json(wb.Sheets[wb.SheetNames[0]]));
        }catch(err){reject(err);}
      };
      reader.readAsArrayBuffer(file);
    });
  }

  // ── 开关逻辑 ──
  function waInitSwitches(){
    // 价格开关
    $('waPriceSwitch').addEventListener('click',()=>{
      $('waPriceSwitch').classList.toggle('active');
      const on=$('waPriceSwitch').classList.contains('active');
      $('waPriceUp').disabled=!on; $('waPriceDown').disabled=!on;
    });
    // 波动率开关
    $('waVolSwitch').addEventListener('click',()=>{
      $('waVolSwitch').classList.toggle('active');
      const on=$('waVolSwitch').classList.contains('active');
      $('waVolCycle').disabled=!on; $('waVolThreshold').disabled=!on;
    });
    // 技术指标开关
    $('waTechSwitch').addEventListener('click',()=>{
      $('waTechSwitch').classList.toggle('active');
      const on=$('waTechSwitch').classList.contains('active');
      ['waTech1','waTech2','waTech3','waTech4','waTech5'].forEach(id=>{
        $( id).style.pointerEvents=on?'auto':'none';
        $( id).style.opacity=on?'1':'0.4';
      });
    });
    // 技术指标复选框
    ['waTech1','waTech2','waTech3','waTech4','waTech5'].forEach(id=>{
      $(id).addEventListener('click',()=>$(id).classList.toggle('checked'));
    });
    // 初始禁用状态视觉
    ['waTech1','waTech2','waTech3','waTech4','waTech5'].forEach(id=>{
      $(id).style.pointerEvents='none'; $(id).style.opacity='0.4';
    });
  }

  // ── 上传事件 ──
  function waInitUploads(){
    $('waHistoryExcel').addEventListener('change',async e=>{
      if(!e.target.files[0]) return;
      try{
        const data=await waReadExcel(e.target.files[0]);
        waHistoryData=data
          .sort((a,b)=>new Date(a.日期)-new Date(b.日期))
          .map(item=>({date:item.日期, price:parseFloat(item['价格(元/桶)'])||0}))
          .filter(item=>!isNaN(item.price)&&item.price>0);
        alert('历史价格Excel读取成功！共'+waHistoryData.length+'条数据');
      }catch(err){ alert('读取历史Excel失败：'+err.message); }
    });

    $('waRealTimeExcel').addEventListener('change',async e=>{
      if(!e.target.files[0]) return;
      try{
        const data=await waReadExcel(e.target.files[0]);
        waRealTimePrice=parseFloat(data[0]['实时价格(元/桶)'])||0;
        alert('实时价格读取成功：'+waRealTimePrice+'元/桶');
      }catch(err){ alert('读取实时Excel失败：'+err.message); }
    });
  }

  // ── 计算函数 ──
  function waCalcVol(priceList,cycle){
    const returns=[];
    for(let i=1;i<priceList.length;i++){
      if(priceList[i-1]>0) returns.push((priceList[i]-priceList[i-1])/priceList[i-1]);
    }
    const recent=returns.slice(-cycle);
    if(recent.length<2) return '0.00';
    const mean=recent.reduce((a,b)=>a+b,0)/recent.length;
    const std=Math.sqrt(recent.reduce((a,b)=>a+Math.pow(b-mean,2),0)/(recent.length-1));
    return (std*100).toFixed(2);
  }

  function waCalcTech(priceList){
    const r90=priceList.slice(-90);
    if(!r90.length) return{support:0,resistance:0,bollMid:0,bollUp:0,bollDown:0};
    const support=Math.min(...r90).toFixed(1), resistance=Math.max(...r90).toFixed(1);
    const r20=priceList.slice(-20);
    if(r20.length<2) return{support,resistance,bollMid:0,bollUp:0,bollDown:0};
    const ma=r20.reduce((a,b)=>a+b,0)/r20.length;
    const std=Math.sqrt(r20.reduce((a,b)=>a+Math.pow(b-ma,2),0)/(r20.length-1));
    return{support,resistance,bollMid:ma.toFixed(1),bollUp:(ma+2*std).toFixed(1),bollDown:(ma-2*std).toFixed(1)};
  }

  // ── 主计算按钮 ──
  function waInitCalc(){
    $('waCalcBtn').addEventListener('click',()=>{
      if(waHistoryData.length<2){ alert('历史数据不足，请先上传Excel1'); return; }
      if(!waRealTimePrice){ alert('未读取实时价格，请先上传Excel2'); return; }

      const prices=waHistoryData.map(d=>d.price);
      const cycle=parseInt($('waVolCycle').value);
      const vol=waCalcVol(prices,cycle);
      const tech=waCalcTech(prices);

      $('waHistoryCycle').textContent=waHistoryData.length;
      $('waRealPrice').textContent=waRealTimePrice.toFixed(1);
      $('waVolCycleShow').textContent=cycle;
      $('waVolValue').textContent=vol;
      $('waSupportPrice').textContent=tech.support;
      $('waResistancePrice').textContent=tech.resistance;
      $('waBollUp').textContent=tech.bollUp;
      $('waBollMid').textContent=tech.bollMid;
      $('waBollDown').textContent=tech.bollDown;

      let alertMsg='未触发任何预警', isAlert=false;

      if($('waPriceSwitch').classList.contains('active')){
        const up=parseFloat($('waPriceUp').value)||0;
        const down=parseFloat($('waPriceDown').value)||0;
        if(up&&waRealTimePrice>=up){ alertMsg=`价格超过上限：${waRealTimePrice} ≥ ${up}元/桶`; isAlert=true; }
        else if(down&&waRealTimePrice<=down){ alertMsg=`价格低于下限：${waRealTimePrice} ≤ ${down}元/桶`; isAlert=true; }
      }
      if(!isAlert&&$('waVolSwitch').classList.contains('active')){
        const thr=parseFloat($('waVolThreshold').value)||0;
        if(thr&&parseFloat(vol)>=thr){ alertMsg=`波动率超阈值：${vol}% ≥ ${thr}%`; isAlert=true; }
      }
      if(!isAlert&&$('waTechSwitch').classList.contains('active')){
        const names=['突破支撑价','突破阻力位','突破布林带上轨','突破布林带中轨','突破布林带下轨'];
        const conds=[
          waRealTimePrice<=parseFloat(tech.support),
          waRealTimePrice>=parseFloat(tech.resistance),
          waRealTimePrice>=parseFloat(tech.bollUp),
          waRealTimePrice>=parseFloat(tech.bollMid),
          waRealTimePrice<=parseFloat(tech.bollDown),
        ];
        ['waTech1','waTech2','waTech3','waTech4','waTech5'].forEach((id,i)=>{
          if(!isAlert&&$(id).classList.contains('checked')&&conds[i]){
            alertMsg=`技术指标触发：${names[i]}（当前价：${waRealTimePrice}）`; isAlert=true;
          }
        });
      }

      $('waAlertResult').textContent=alertMsg;
      $('waResultArea').style.display='block';

      if(isAlert){
        $('waAlertModal').style.display='block';
        setTimeout(()=>$('waAlertModal').style.display='none',5000);
      }
    });
  }


})();  // ↓ 加上这行，关闭预警模块的闭包
/* 数据库图表配色补丁 — 覆盖原有ECharts配色以匹配金色体系 */
(function(){
  const _origRenderKline = window.dbChangeProduct;
  const _origInitDB = window.initDatabaseView;

  // 补丁：覆盖K线图渲染
  const patchKlineColors = function(){
    const wrap = document.getElementById('dbKLineChart');
    if(!wrap) return;
    const chart = echarts.getInstanceByDom(wrap);
    if(!chart) return;

    // 更新K线颜色
    chart.setOption({
      backgroundColor: 'transparent',
      textStyle: { color: 'rgba(240,240,242,0.6)' },
      tooltip: {
        borderColor: '#d6b36a',
        backgroundColor: 'rgba(18,18,20,.95)',
        textStyle: { color: '#f6e3b2' }
      },
      legend: {
        textStyle: { color: '#f6e3b2', fontFamily:'"Noto Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif' }
      },
      xAxis: {
        axisLine: { lineStyle: { color: 'rgba(214,179,106,.25)' } },
        axisLabel: { color: 'rgba(240,240,242,.50)' }
      },
      yAxis: {
        axisLine: { lineStyle: { color: 'rgba(214,179,106,.25)' } },
        splitLine: { lineStyle: { color: 'rgba(214,179,106,.06)', type: 'dashed' } },
        axisLabel: { color: 'rgba(240,240,242,.50)' }
      },
      series: [
        { name:'K线', itemStyle: { color:'#ff5c7c', color0:'#39d98a', borderColor:'#ff5c7c', borderColor0:'#39d98a' } },
        { lineStyle: { color:'#d6b36a' } },
        { lineStyle: { color:'#f6e3b2' } }
      ]
    });
  };

  // 补丁：覆盖供需图表颜色
  const patchSupplyColors = function(){
    const opecEl = document.getElementById('dbOpecPie');
    const demEl = document.getElementById('dbDemandBar');

    if(opecEl){
      const chart = echarts.getInstanceByDom(opecEl);
      if(chart){
        chart.setOption({
          color: ['#d6b36a', '#f6e3b2', '#9a7638', '#c49a48', '#b8924c', '#8a7015', '#dcc88a', '#a68945', '#e0c070', '#7a6028'],
          tooltip: {
            textStyle: { color: '#f6e3b2' },
            backgroundColor: 'rgba(18,18,20,.95)',
            borderColor: 'rgba(214,179,106,.30)'
          },
          legend: { textStyle: { color: '#f6e3b2' } },
          series: [{ label: { color: '#f6e3b2' }, labelLine: { lineStyle: { color: '#d6b36a' } } }]
        });
      }
    }

    if(demEl){
      const chart = echarts.getInstanceByDom(demEl);
      if(chart){
        chart.setOption({
          tooltip: {
            textStyle: { color: '#f6e3b2' },
            backgroundColor: 'rgba(18,18,20,.95)',
            borderColor: 'rgba(214,179,106,.30)'
          },
          xAxis: {
            axisLine: { lineStyle: { color: '#d6b36a' } },
            axisLabel: { color: '#f6e3b2' }
          },
          yAxis: {
            nameTextStyle: { color: '#f6e3b2' },
            axisLine: { lineStyle: { color: '#d6b36a' } },
            axisLabel: { color: '#f6e3b2' },
            splitLine: { lineStyle: { color: 'rgba(214,179,106,.10)' } }
          },
          series: [{
            itemStyle: {
              color: new echarts.graphic.LinearGradient(0,0,0,1,[
                {offset:0, color:'#d6b36a'},
                {offset:1, color:'#9a7638'}
              ])
            },
            label: { color: '#f6e3b2' }
          }]
        });
      }
    }
  };

  // 监听数据库视图初始化完成后应用补丁
  const origInit = window.initDatabaseView;
  window.initDatabaseView = function(){
    if(origInit) origInit();
    // 延迟应用补丁，等待图表渲染完成
    setTimeout(function(){
      patchKlineColors();
      patchSupplyColors();
    }, 500);
    // 再延迟一次确保
    setTimeout(function(){
      patchKlineColors();
      patchSupplyColors();
    }, 1500);
  };

  // 补丁K线品种切换
  const origChange = window.dbChangeProduct;
  window.dbChangeProduct = function(p){
    if(origChange) origChange(p);
    setTimeout(patchKlineColors, 300);
  };

  // 补丁自定义弹窗图表
  const origRenderCustom = window.dbRenderCustom;
  window.dbRenderCustom = function(){
    if(origRenderCustom) origRenderCustom();
    setTimeout(function(){
      const chartEl = document.getElementById('dbCustomLineChart');
      if(!chartEl) return;
      const chart = echarts.getInstanceByDom(chartEl);
      if(!chart) return;
      chart.setOption({
        tooltip: {
          backgroundColor: 'rgba(18,18,20,.95)',
          borderColor: 'rgba(214,179,106,.30)',
          textStyle: { color: '#f6e3b2' }
        },
        legend: { textStyle: { color: '#f6e3b2' } },
        xAxis: {
          axisLabel: { color: 'rgba(240,240,242,.50)' },
          splitLine: { show: false }
        },
        yAxis: {
          axisLabel: { color: 'rgba(240,240,242,.50)' },
          splitLine: { lineStyle: { color: 'rgba(214,179,106,.08)' } }
        },
        series: [
          { lineStyle: { color: '#d6b36a' }, areaStyle: { color: 'rgba(214,179,106,.08)' } },
          { lineStyle: { color: '#f6e3b2' }, areaStyle: { color: 'rgba(246,227,178,.06)' } }
        ]
      });
    }, 300);
  };
})();
