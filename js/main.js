window.VIEW_NAV = window.VIEW_NAV || {
  "view-home": null,
  "view-module-news": "nl-zixun",
  "view-research": "nl-zixun",
  "view-supply": "nl-zixun",
  "view-database": "nl-data",
  "view-api": "nl-data",
  "view-forecast": "nl-forecast",
  "view-hedge": "nl-forecast",
  "view-about": "nl-about",
  "view-pricing": "nl-about",
  "view-contact": "nl-about",
};

window.CC_AUTH_STORAGE_KEY = window.CC_AUTH_STORAGE_KEY || "cc_auth_user";

window.CC_MARKET_API_CONFIG = window.CC_MARKET_API_CONFIG || (() => {
  const base = /^https?:/i.test(window.location.href)
    ? window.location.origin
    : "http://127.0.0.1:8008";
  return {
    base,
    snapshotEndpoint: `${base}/api/market/snapshot`,
    seriesEndpoint: `${base}/api/market/series`,
  };
})();

function switchView(viewId) {
  document.querySelectorAll(".view").forEach((view) => view.classList.remove("active"));
  const target = document.getElementById(viewId);
  if (target) target.classList.add("active");

  document.body.classList.toggle("view-inner", viewId !== "view-home");
  document.querySelectorAll(".nav-link").forEach((link) => link.classList.remove("active"));

  const navId = window.VIEW_NAV[viewId];
  if (navId) {
    const navElement = document.getElementById(navId);
    if (navElement) navElement.classList.add("active");
  }

  window.scrollTo({ top: 0, behavior: "instant" });

  if (viewId === "view-forecast") {
    setTimeout(initForecastOnce, 30);
  }
  if (viewId === "view-database") {
    setTimeout(() => {
      if (typeof initDatabaseView === "function") initDatabaseView();
    }, 30);
  }
  if (viewId === "view-api") {
    setTimeout(() => {
      if (typeof window._loadDbDownload === "function") window._loadDbDownload();
      const frame = document.getElementById("db-download-frame");
      if (frame) {
        frame.style.height = "0";
        void frame.offsetHeight;
        frame.style.height = "calc(100vh - var(--header-h))";
      }
    }, 50);
  }
  if (viewId === "view-supply") {
    setTimeout(() => {
      if (typeof window._loadSupplyView === "function") window._loadSupplyView();
    }, 50);
  }
  if (viewId === "view-research") {
    setTimeout(() => {
      if (!window._rpInited) {
        window._rpInited = true;
        if (typeof rpRenderAllGlobal === "function") rpRenderAllGlobal();
      }
    }, 30);
  }
}

function openLogin() {
  window.location.href = "login.html";
}

(function initAuthActionsDemo() {
  const host = document.getElementById("authActions");
  if (!host) return;

  let session = null;
  try {
    session = JSON.parse(localStorage.getItem(window.CC_AUTH_STORAGE_KEY) || "null");
  } catch {
    session = null;
  }

  if (!session || !session.loggedIn) return;
  if (sessionStorage.getItem("cc_auth_demo_once") !== "1") {
    localStorage.removeItem(window.CC_AUTH_STORAGE_KEY);
    return;
  }

  const title = session.email || "已登录账户";
  host.innerHTML = `<a href="javascript:void(0)" class="auth-avatar" aria-label="已登录账户" title="${title}">
    <svg viewBox="0 0 24 24" fill="none" aria-hidden="true">
      <path d="M12 12a4 4 0 1 0 0-8 4 4 0 0 0 0 8Z" stroke="currentColor" stroke-width="1.9"/>
      <path d="M4.5 20a7.5 7.5 0 0 1 15 0" stroke="currentColor" stroke-width="1.9" stroke-linecap="round"/>
    </svg>
  </a>`;
  sessionStorage.removeItem("cc_auth_demo_once");
})();

window.addEventListener("scroll", () => {
  const header = document.querySelector("header");
  if (!header) return;
  if (window.scrollY > 50) {
    header.style.background = "rgba(8,8,10,.95)";
    header.style.borderBottomColor = "rgba(255,255,255,.10)";
  } else {
    header.style.background = "rgba(12,12,14,.80)";
    header.style.borderBottomColor = "rgba(255,255,255,.08)";
  }
});

function scrollToTop() {
  window.scrollTo({ top: 0, behavior: "smooth" });
}

(function initHomeMarketModule() {
  const wtiLine = document.getElementById("lineWTI");
  const brentLine = document.getElementById("lineBrent");
  const xAxis = document.getElementById("homePriceXAxis");
  const hoverZone = document.getElementById("homePriceHoverZone");
  const tooltip = document.getElementById("homePriceTooltip");
  const tooltipDate = document.getElementById("homePriceTooltipDate");
  const tooltipWTI = document.getElementById("homePriceTooltipWTI");
  const tooltipBrent = document.getElementById("homePriceTooltipBrent");
  const crosshair = document.getElementById("homePriceCrosshair");
  const dotWTI = document.getElementById("homePriceDotWTI");
  const dotBrent = document.getElementById("homePriceDotBrent");
  const chartBox = document.getElementById("homePriceChart");
  const tooltipRowWTI = tooltipWTI ? tooltipWTI.closest(".chart-tooltip-row") : null;
  const tooltipRowBrent = tooltipBrent ? tooltipBrent.closest(".chart-tooltip-row") : null;
  const homeMarketRoot = document.getElementById("home-market");
  const tableBodies = homeMarketRoot
    ? homeMarketRoot.querySelectorAll(".grid2 .card table tbody")
    : [];
  const futuresBody = tableBodies[0] || null;
  const spotBody = tableBodies[1] || null;

  if (
    !wtiLine ||
    !brentLine ||
    !xAxis ||
    !hoverZone ||
    !tooltip ||
    !tooltipDate ||
    !tooltipWTI ||
    !tooltipBrent ||
    !crosshair ||
    !dotWTI ||
    !dotBrent ||
    !chartBox ||
    !tooltipRowWTI ||
    !tooltipRowBrent
  ) {
    return;
  }

  const apiConfig = window.CC_MARKET_API_CONFIG || {};
  const x0 = 60;
  const x1 = 870;
  const yTop = 40;
  const yBottom = 320;
  const maxValue = 100;

  let data = [
    { date: "2025-01-01", wti: 71.4, brent: 74.8 },
    { date: "2025-02-01", wti: 72.1, brent: 75.6 },
    { date: "2025-03-01", wti: 70.8, brent: 74.2 },
    { date: "2025-04-01", wti: 68.9, brent: 72.5 },
    { date: "2025-05-01", wti: 66.7, brent: 70.3 },
    { date: "2025-06-01", wti: 64.8, brent: 68.4 },
    { date: "2025-07-01", wti: 63.5, brent: 67.1 },
    { date: "2025-08-01", wti: 65.2, brent: 68.9 },
    { date: "2025-09-01", wti: 67.8, brent: 71.2 },
    { date: "2025-10-01", wti: 69.1, brent: 72.8 },
    { date: "2025-11-01", wti: 70.4, brent: 73.9 },
    { date: "2025-12-01", wti: 72.3, brent: 75.5 },
    { date: "2026-01-01", wti: 73.6, brent: 77.1 },
  ];

  const formatPrice = (value) => `${Number(value).toFixed(2)} USD/bbl`;
  const formatSigned = (value, digits = 2) => {
    const number = Number(value || 0);
    const prefix = number > 0 ? "+" : "";
    return `${prefix}${number.toFixed(digits)}`;
  };
  const cssClassForValue = (value) => (Number(value || 0) >= 0 ? "pos" : "neg");

  const xAt = (index) => {
    if (data.length <= 1) return x0;
    return x0 + ((x1 - x0) * index) / (data.length - 1);
  };

  const yAt = (value) => yBottom - ((yBottom - yTop) * Number(value || 0)) / maxValue;

  const toPoints = (key) =>
    data
      .map(
        (item, index) =>
          `${xAt(index).toFixed(2)},${yAt(item[key]).toFixed(2)}`
      )
      .join(" ");

  const buildXAxisLabels = () => {
    if (!data.length) return "";
    const tickCount = Math.min(7, data.length);
    const indexes = [];
    for (let i = 0; i < tickCount; i += 1) {
      const index = Math.round(((data.length - 1) * i) / Math.max(tickCount - 1, 1));
      if (!indexes.includes(index)) indexes.push(index);
    }
    return indexes
      .map((index, position, arr) => {
        const anchor =
          position === 0 ? "start" : position === arr.length - 1 ? "end" : "middle";
        const dateLabel = String(data[index].date || "").slice(5).replace("-", "/");
        return `<text x="${xAt(index).toFixed(2)}" y="344" text-anchor="${anchor}">${dateLabel}</text>`;
      })
      .join("");
  };

  const renderHomeSnapshot = (items) => {
    if (!Array.isArray(items) || !items.length) return;
    const bySymbol = new Map(
      items.map((item) => [String(item.symbol || "").toUpperCase(), item])
    );
    const wti = bySymbol.get("WTI");
    const brent = bySymbol.get("BRENT");
    if (!wti || !brent) return;

    const buildRows = () => `
      <tr><td>WTI</td><td>${Number(wti.close_price).toFixed(2)}</td><td class="${cssClassForValue(wti.change)}">${formatSigned(wti.change)}</td></tr>
      <tr><td>Brent</td><td>${Number(brent.close_price).toFixed(2)}</td><td class="${cssClassForValue(brent.change)}">${formatSigned(brent.change)}</td></tr>
    `;

    if (futuresBody) futuresBody.innerHTML = buildRows();
    if (spotBody) spotBody.innerHTML = buildRows();
  };

  const renderChart = () => {
    if (!data.length) return;
    wtiLine.setAttribute("points", toPoints("wti"));
    brentLine.setAttribute("points", toPoints("brent"));
    xAxis.innerHTML = buildXAxisLabels();
  };

  const formatTooltipDate = (value) => {
    const date = new Date(`${value}T00:00:00`);
    const year = date.getFullYear();
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${year}-${month}-${day}`;
  };

  const setSeriesState = (activeKey) => {
    const activeLine = activeKey === "wti" ? wtiLine : brentLine;
    const inactiveLine = activeKey === "wti" ? brentLine : wtiLine;
    const activeDot = activeKey === "wti" ? dotWTI : dotBrent;
    const inactiveDot = activeKey === "wti" ? dotBrent : dotWTI;
    activeLine.setAttribute("opacity", "1");
    activeLine.setAttribute("stroke-width", "4");
    inactiveLine.setAttribute("opacity", "0.22");
    inactiveLine.setAttribute("stroke-width", "2.4");
    activeDot.setAttribute("opacity", "1");
    inactiveDot.setAttribute("opacity", "0");
    tooltipRowWTI.hidden = activeKey !== "wti";
    tooltipRowBrent.hidden = activeKey !== "brent";
  };

  const resetSeriesState = () => {
    wtiLine.setAttribute("opacity", "1");
    wtiLine.setAttribute("stroke-width", "3");
    brentLine.setAttribute("opacity", "0.95");
    brentLine.setAttribute("stroke-width", "3");
    dotWTI.setAttribute("opacity", "0");
    dotBrent.setAttribute("opacity", "0");
    tooltipRowWTI.hidden = false;
    tooltipRowBrent.hidden = false;
  };

  const hidePoint = () => {
    tooltip.hidden = true;
    crosshair.setAttribute("opacity", "0");
    resetSeriesState();
  };

  const showPoint = (index, activeKey) => {
    const point = data[index];
    if (!point) return;
    const x = xAt(index);
    const wtiY = yAt(point.wti);
    const brentY = yAt(point.brent);

    setSeriesState(activeKey);
    crosshair.setAttribute("x1", x.toFixed(2));
    crosshair.setAttribute("x2", x.toFixed(2));
    crosshair.setAttribute("opacity", "1");
    dotWTI.setAttribute("cx", x.toFixed(2));
    dotWTI.setAttribute("cy", wtiY.toFixed(2));
    dotBrent.setAttribute("cx", x.toFixed(2));
    dotBrent.setAttribute("cy", brentY.toFixed(2));
    tooltipDate.textContent = formatTooltipDate(point.date);
    tooltipWTI.textContent = formatPrice(point.wti);
    tooltipBrent.textContent = formatPrice(point.brent);
    tooltip.hidden = false;

    const boxRect = chartBox.getBoundingClientRect();
    const scaleX = boxRect.width / 900;
    const scaleY = boxRect.height / 360;
    const tooltipWidth = 168;
    const tooltipHeight = 88;
    const tooltipX = Math.min(
      boxRect.width - tooltipWidth - 12,
      Math.max(12, x * scaleX + 16)
    );
    const tooltipY = Math.min(
      boxRect.height - tooltipHeight - 12,
      Math.max(12, Math.min(wtiY, brentY) * scaleY - 24)
    );
    tooltip.style.left = `${tooltipX}px`;
    tooltip.style.top = `${tooltipY}px`;
  };

  const onMove = (event) => {
    if (!data.length) return;
    const rect = hoverZone.getBoundingClientRect();
    const offsetX = Math.min(rect.width, Math.max(0, event.clientX - rect.left));
    const offsetY = Math.min(rect.height, Math.max(0, event.clientY - rect.top));
    const index = Math.round((offsetX / Math.max(rect.width, 1)) * (data.length - 1));
    const svgY = yTop + (offsetY / Math.max(rect.height, 1)) * (yBottom - yTop);
    const point = data[index];
    if (!point) return;
    const activeKey =
      Math.abs(svgY - yAt(point.wti)) <= Math.abs(svgY - yAt(point.brent))
        ? "wti"
        : "brent";
    showPoint(index, activeKey);
  };

  const fetchJson = async (url) => {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  };

  const buildChartRows = (wtiRows, brentRows) => {
    const byDate = new Map();
    wtiRows.forEach((row) => {
      if (!row.trade_date) return;
      byDate.set(row.trade_date, {
        ...(byDate.get(row.trade_date) || {}),
        date: row.trade_date,
        wti: Number(row.close_price),
      });
    });
    brentRows.forEach((row) => {
      if (!row.trade_date) return;
      byDate.set(row.trade_date, {
        ...(byDate.get(row.trade_date) || {}),
        date: row.trade_date,
        brent: Number(row.close_price),
      });
    });
    return Array.from(byDate.values())
      .filter((row) => Number.isFinite(row.wti) && Number.isFinite(row.brent))
      .sort((a, b) => a.date.localeCompare(b.date))
      .slice(-240);
  };

  const loadMarketData = async () => {
    try {
      const [snapshotPayload, wtiPayload, brentPayload] = await Promise.all([
        fetchJson(apiConfig.snapshotEndpoint),
        fetchJson(`${apiConfig.seriesEndpoint}?symbol=WTI&limit=260`),
        fetchJson(`${apiConfig.seriesEndpoint}?symbol=Brent&limit=260`),
      ]);

      renderHomeSnapshot(snapshotPayload.items);

      const nextData = buildChartRows(wtiPayload.rows || [], brentPayload.rows || []);
      if (nextData.length >= 2) {
        data = nextData;
        renderChart();
        hidePoint();
      }
    } catch (error) {
      console.warn("Failed to load local market data.", error);
    }
  };

  renderChart();
  hoverZone.addEventListener("mousemove", onMove);
  hoverZone.addEventListener("mouseenter", onMove);
  hoverZone.addEventListener("mouseleave", hidePoint);
  hidePoint();
  void loadMarketData();
})();

(function initHeaderSearch() {
  const wrap = document.getElementById("searchWrap");
  const button = document.getElementById("searchBtn");
  const input = document.getElementById("searchInput");
  if (!wrap || !button || !input) return;

  const open = () => {
    document.body.classList.add("search-open");
    setTimeout(() => input.focus(), 0);
  };

  const close = () => {
    document.body.classList.remove("search-open");
    input.blur();
  };

  const submit = () => {
    const query = (input.value || "").trim();
    if (!query) return;
    alert(`搜索：${query}`);
  };

  button.addEventListener("click", (event) => {
    event.stopPropagation();
    if (!document.body.classList.contains("search-open")) {
      open();
      return;
    }
    if ((input.value || "").trim()) {
      submit();
    } else {
      input.focus();
    }
  });

  wrap.addEventListener("mouseenter", open);
  input.addEventListener("keydown", (event) => {
    if (event.key === "Enter") submit();
    if (event.key === "Escape") close();
  });
  document.addEventListener("click", (event) => {
    if (document.body.classList.contains("search-open") && !wrap.contains(event.target)) {
      close();
    }
  });
  input.addEventListener("blur", () => {
    setTimeout(() => {
      if (!wrap.matches(":hover") && document.activeElement !== input) close();
    }, 120);
  });
})();
