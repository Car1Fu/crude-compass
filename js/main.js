/* ══════════════════════════════════
   SPA VIEW SWITCHER
══════════════════════════════════ */
window.VIEW_NAV = window.VIEW_NAV || {
  'view-home':null,'view-module-news':'nl-zixun','view-research':'nl-zixun',
  'view-supply':'nl-zixun','view-database':'nl-data','view-api':'nl-data',
  'view-forecast':'nl-forecast','view-hedge':'nl-forecast','view-warning':'nl-forecast',
  'view-about':'nl-about','view-pricing':'nl-about','view-contact':'nl-about',
};
window.CC_AUTH_STORAGE_KEY = window.CC_AUTH_STORAGE_KEY || 'cc_auth_user';
function switchView(viewId){
  document.querySelectorAll('.view').forEach(v=>v.classList.remove('active'));
  const t=document.getElementById(viewId);
  if(t) t.classList.add('active');
  document.body.classList.toggle('view-inner', viewId!=='view-home');
  document.querySelectorAll('.nav-link').forEach(l=>l.classList.remove('active'));
  const navId=window.VIEW_NAV[viewId];
  if(navId){const el=document.getElementById(navId);if(el)el.classList.add('active');}
  window.scrollTo({top:0,behavior:'instant'});
  if(viewId==='view-forecast') { setTimeout(initForecastOnce, 30); }
  if(viewId==='view-database') { setTimeout(()=>{ if(typeof initDatabaseView==='function') initDatabaseView(); }, 30); }
  if(viewId==='view-api') {
    setTimeout(()=>{
      if(typeof window._loadDbDownload==='function') window._loadDbDownload();
      const frame = document.getElementById('db-download-frame');
      if(frame){ frame.style.height='0'; void frame.offsetHeight; frame.style.height='calc(100vh - var(--header-h))'; }
    }, 50);
  }
  if(viewId==='view-supply') {
    setTimeout(()=>{
      if(typeof window._loadSupplyView==='function') window._loadSupplyView();
    }, 50);
  }
  if(viewId==='view-research') { setTimeout(()=>{ if(!window._rpInited){window._rpInited=true; if(typeof rpRenderAllGlobal==='function') rpRenderAllGlobal(); } }, 30); }
}

function openLogin(){ window.location.href = 'login.html'; }

(function initAuthActionsDemo(){
  const host=document.getElementById('authActions');
  if(!host)return;
  let session=null;
  try{session=JSON.parse(localStorage.getItem(window.CC_AUTH_STORAGE_KEY)||'null');}catch{session=null;}
  if(!session||!session.loggedIn)return;
  if(sessionStorage.getItem('cc_auth_demo_once')!=='1'){
    localStorage.removeItem(window.CC_AUTH_STORAGE_KEY);
    return;
  }
  const title=session.email||'已登录账户';
  host.innerHTML=`<a href="javascript:void(0)" class="auth-avatar" aria-label="已登录账户" title="${title}">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.9"/>
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    </svg>
  </a>`;
  sessionStorage.removeItem('cc_auth_demo_once');
})();

(function initAuthActions(){
  return;
  const host=document.getElementById('authActions');
  if(!host)return;
  let session=null;
  try{session=JSON.parse(localStorage.getItem(window.CC_AUTH_STORAGE_KEY)||'null');}catch{session=null;}
  if(!session||!session.loggedIn)return;
  const title=session.email||'已登录账户';
  host.innerHTML=`<a href="javascript:void(0)" class="auth-avatar" aria-label="已登录账户" title="${title}">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.9"/>
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    </svg>
  </a>`;
})();

// Apple 风格：滚动时导航栏背景加深
window.addEventListener('scroll', function() {
  const header = document.querySelector('header');
  if (window.scrollY > 50) {
    header.style.background = 'rgba(8,8,10,.95)';
    header.style.borderBottomColor = 'rgba(255,255,255,.10)';
  } else {
    header.style.background = 'rgba(12,12,14,.80)';
    header.style.borderBottomColor = 'rgba(255,255,255,.08)';
  }
});
function scrollToTop(){window.scrollTo({top:0,behavior:'smooth'});}

/* ── Price chart (home) ── */
(function(){
  const wti=document.getElementById("lineWTI"),brent=document.getElementById("lineBrent");
  if(!wti||!brent)return;
  const x0=60,x1=870,yT=40,yB=320,N=160;
  const mk=(seed,base,vol)=>{let v=base;const a=[];for(let i=0;i<N;i++){v+=(Math.sin((i+seed)/9)*.6+(Math.random()-.5))*vol;if(i===35)v+=35;if(i===45)v-=55;if(i===105)v-=40;if(i===118)v+=38;v=Math.max(-5,Math.min(140,v));a.push(v);}return a;};
  const toP=a=>a.map((v,i)=>`${(x0+(x1-x0)*(i/(N-1))).toFixed(2)},${(yB-(yB-yT)*(v/100)).toFixed(2)}`).join(" ");
  wti.setAttribute("points",toP(mk(2,55,1.5)));brent.setAttribute("points",toP(mk(7,60,1.35)));
})();

/* Home chart interaction upgrade */
(function(){
  const wti=document.getElementById("lineWTI");
  const brent=document.getElementById("lineBrent");
  const xAxis=document.getElementById("homePriceXAxis");
  const hoverZone=document.getElementById("homePriceHoverZone");
  const tooltip=document.getElementById("homePriceTooltip");
  const tooltipDate=document.getElementById("homePriceTooltipDate");
  const tooltipWTI=document.getElementById("homePriceTooltipWTI");
  const tooltipBrent=document.getElementById("homePriceTooltipBrent");
  const crosshair=document.getElementById("homePriceCrosshair");
  const dotWTI=document.getElementById("homePriceDotWTI");
  const dotBrent=document.getElementById("homePriceDotBrent");
  const chartBox=document.getElementById("homePriceChart");
  const tooltipRowWTI=tooltipWTI ? tooltipWTI.closest(".chart-tooltip-row") : null;
  const tooltipRowBrent=tooltipBrent ? tooltipBrent.closest(".chart-tooltip-row") : null;
  if(!wti||!brent||!xAxis||!hoverZone||!tooltip||!tooltipDate||!tooltipWTI||!tooltipBrent||!crosshair||!dotWTI||!dotBrent||!chartBox||!tooltipRowWTI||!tooltipRowBrent)return;

  const x0=60,x1=870,yT=40,yB=320,maxValue=100;
  const data=[
    { date:"2025-01-01", wti:71.4, brent:74.8 },
    { date:"2025-02-01", wti:72.1, brent:75.6 },
    { date:"2025-03-01", wti:70.8, brent:74.2 },
    { date:"2025-04-01", wti:68.9, brent:72.5 },
    { date:"2025-05-01", wti:66.7, brent:70.3 },
    { date:"2025-06-01", wti:64.8, brent:68.4 },
    { date:"2025-07-01", wti:63.5, brent:67.1 },
    { date:"2025-08-01", wti:65.2, brent:68.9 },
    { date:"2025-09-01", wti:67.8, brent:71.2 },
    { date:"2025-10-01", wti:69.1, brent:72.8 },
    { date:"2025-11-01", wti:70.4, brent:73.9 },
    { date:"2025-12-01", wti:72.3, brent:75.5 },
    { date:"2026-01-01", wti:73.6, brent:77.1 }
  ];
  const xAt=index=>x0+((x1-x0)*index/(data.length-1));
  const yAt=value=>yB-((yB-yT)*(value/maxValue));
  const fmtDate=value=>{
    const d=new Date(value+"T00:00:00");
    const y=d.getFullYear();
    const m=String(d.getMonth()+1).padStart(2,"0");
    const day=String(d.getDate()).padStart(2,"0");
    return `${y}-${m}-${day}`;
  };
  const fmtPrice=value=>`${value.toFixed(2)} USD/bbl`;
  const toPoints=key=>data.map((item,index)=>`${xAt(index).toFixed(2)},${yAt(item[key]).toFixed(2)}`).join(" ");

  wti.setAttribute("points",toPoints("wti"));
  brent.setAttribute("points",toPoints("brent"));

  xAxis.innerHTML=[0,2,4,6,8,10,12].map((index,i,arr)=>{
    const x=xAt(index);
    const anchor=i===0?"start":(i===arr.length-1?"end":"middle");
    const dateLabel=data[index].date.slice(5).replace("-", "/");
    return `<text x="${x.toFixed(2)}" y="344" text-anchor="${anchor}">${dateLabel}</text>`;
  }).join("");

  const setSeriesState=activeKey=>{
    const activeLine=activeKey==="wti" ? wti : brent;
    const inactiveLine=activeKey==="wti" ? brent : wti;
    const activeDot=activeKey==="wti" ? dotWTI : dotBrent;
    const inactiveDot=activeKey==="wti" ? dotBrent : dotWTI;
    activeLine.setAttribute("opacity","1");
    activeLine.setAttribute("stroke-width","4");
    inactiveLine.setAttribute("opacity","0.22");
    inactiveLine.setAttribute("stroke-width","2.4");
    activeDot.setAttribute("opacity","1");
    inactiveDot.setAttribute("opacity","0");
    tooltipRowWTI.hidden=activeKey!=="wti";
    tooltipRowBrent.hidden=activeKey!=="brent";
  };

  const resetSeriesState=()=>{
    wti.setAttribute("opacity","1");
    wti.setAttribute("stroke-width","3");
    brent.setAttribute("opacity","0.95");
    brent.setAttribute("stroke-width","3");
    dotWTI.setAttribute("opacity","0");
    dotBrent.setAttribute("opacity","0");
    tooltipRowWTI.hidden=false;
    tooltipRowBrent.hidden=false;
  };

  const showPoint=(index,activeKey)=>{
    const point=data[index];
    const x=xAt(index);
    const wtiY=yAt(point.wti);
    const brentY=yAt(point.brent);
    setSeriesState(activeKey);
    crosshair.setAttribute("x1",x.toFixed(2));
    crosshair.setAttribute("x2",x.toFixed(2));
    crosshair.setAttribute("opacity","1");
    dotWTI.setAttribute("cx",x.toFixed(2));
    dotWTI.setAttribute("cy",wtiY.toFixed(2));
    dotBrent.setAttribute("cx",x.toFixed(2));
    dotBrent.setAttribute("cy",brentY.toFixed(2));
    tooltipDate.textContent=fmtDate(point.date);
    tooltipWTI.textContent=fmtPrice(point.wti);
    tooltipBrent.textContent=fmtPrice(point.brent);
    tooltip.hidden=false;

    const boxRect=chartBox.getBoundingClientRect();
    const scaleX=boxRect.width/900;
    const scaleY=boxRect.height/360;
    const tooltipWidth=168;
    const tooltipHeight=88;
    const tooltipX=Math.min(boxRect.width-tooltipWidth-12, Math.max(12, x*scaleX+16));
    const tooltipY=Math.min(boxRect.height-tooltipHeight-12, Math.max(12, Math.min(wtiY,brentY)*scaleY-24));
    tooltip.style.left=`${tooltipX}px`;
    tooltip.style.top=`${tooltipY}px`;
  };

  const hidePoint=()=>{
    tooltip.hidden=true;
    crosshair.setAttribute("opacity","0");
    resetSeriesState();
  };

  const move=e=>{
    const rect=hoverZone.getBoundingClientRect();
    const offsetX=Math.min(rect.width, Math.max(0, e.clientX-rect.left));
    const offsetY=Math.min(rect.height, Math.max(0, e.clientY-rect.top));
    const index=Math.round((offsetX/rect.width)*(data.length-1));
    const svgY=yT+((offsetY/rect.height)*(yB-yT));
    const point=data[index];
    const activeKey=Math.abs(svgY-yAt(point.wti))<=Math.abs(svgY-yAt(point.brent)) ? "wti" : "brent";
    showPoint(index,activeKey);
  };

  hoverZone.addEventListener("mousemove",move);
  hoverZone.addEventListener("mouseenter",move);
  hoverZone.addEventListener("mouseleave",hidePoint);
  hidePoint();
})();

/* ── Header search ── */
(function(){
  const wrap=document.getElementById("searchWrap"),btn=document.getElementById("searchBtn"),input=document.getElementById("searchInput");
  const open=()=>{document.body.classList.add("search-open");setTimeout(()=>input.focus(),0);};
  const close=()=>{document.body.classList.remove("search-open");input.blur();};
  const submit=()=>{const q=(input.value||"").trim();if(!q)return;alert("搜索："+q);};
  btn.addEventListener("click",e=>{e.stopPropagation();if(!document.body.classList.contains("search-open"))open();else if((input.value||"").trim())submit();else input.focus();});
  wrap.addEventListener("mouseenter",()=>open());
  input.addEventListener("keydown",e=>{if(e.key==="Enter")submit();if(e.key==="Escape")close();});
  document.addEventListener("click",e=>{if(document.body.classList.contains("search-open")&&!wrap.contains(e.target))close();});
  input.addEventListener("blur",()=>{setTimeout(()=>{if(!wrap.matches(":hover")&&document.activeElement!==input)close();},120);});
})();
