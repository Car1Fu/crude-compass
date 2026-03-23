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

(function initAuthActions(){
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
