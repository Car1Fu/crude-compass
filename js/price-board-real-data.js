(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href) ? window.location.origin : "http://127.0.0.1:8008");

  const sections = {
    crudeSpot: {
      id: "db-crude-oil",
      columns: "spot",
      groups: [
        ["crude_spot_daily", "price", [
          "中国胜利原油",
          "中国大庆原油",
          "OPEC一揽子原油",
          "科威特能源公司原油现货",
          "阿联酋迪拜原油",
          "阿曼原油",
          "马来西亚塔皮斯原油",
          "印尼米纳斯原油",
          "印尼辛塔原油",
          "印尼杜里原油",
        ]],
      ],
    },
    futuresIntl: {
      id: "db-futures-intl",
      columns: "futures",
      groups: [
        ["crude_futures_daily", "close_price", [
          "IPE布油期货（连续合约）",
          "WTI原油期货（连续合约）",
          "INE原油期货（连续合约）",
        ]],
        ["refined_futures_daily", "close_price", [
          "ICE柴油期货",
          "ICE柴油期货（活跃合约）",
          "INE低硫燃料油期货（连续）",
          "INE低硫燃料油期货（活跃合约）",
          "INE低硫燃料油期货（1月交割连续）",
          "INE低硫燃料油期货（5月交割连续）",
          "INE低硫燃料油期货（9月交割连续）",
          "INE燃料油期货（连续）",
          "INE燃料油期货（活跃合约）",
          "INE燃料油期货(1月交割连续)",
          "INE燃料油期货(5月交割连续)",
          "INE燃料油期货(9月交割连续)",
        ]],
      ],
    },
    futuresShanghai: {
      id: "db-futures-sh",
      columns: "futures",
      groups: [
        ["crude_futures_daily", "close_price", ["INE原油期货（连续合约）"]],
        ["refined_futures_daily", "close_price", [
          "INE低硫燃料油期货（连续）",
          "INE低硫燃料油期货（活跃合约）",
          "INE低硫燃料油期货（1月交割连续）",
          "INE低硫燃料油期货（5月交割连续）",
          "INE低硫燃料油期货（9月交割连续）",
          "INE燃料油期货（连续）",
          "INE燃料油期货（活跃合约）",
          "INE燃料油期货(1月交割连续)",
          "INE燃料油期货(5月交割连续)",
          "INE燃料油期货(9月交割连续)",
        ]],
      ],
    },
  };

  const productCats = [
    ["diesel", "柴油", "refined_diesel_spot_daily", "price", [
      "美国：纽约港超低硫2号柴油",
      "美国:海湾地区超低硫2号柴油",
      "美国:洛杉矶超低硫CARB柴油",
      "新加坡(FOB,中间价)柴油(含硫0.05%)",
      "新加坡(FOB,低端价)柴油(含硫0.05%)",
      "新加坡(FOB,高端价)柴油(含硫0.05%)",
      "新加坡(FOB,中间价)柴油(含硫0.5%)",
      "新加坡(FOB,低端价)柴油(含硫0.5%)",
      "新加坡(FOB,高端价)柴油(含硫0.5%)",
      "鹿特丹(FOB,中间价)柴油(含硫0.05%)",
      "鹿特丹(FOB,低端价)柴油(含硫0.05%)",
      "鹿特丹(FOB,高端价)柴油(含硫0.05%)",
    ]],
    ["gasoline", "汽油", "refined_gasoline_spot_daily", "price", [
      "新加坡（FOB，低端价)无铅汽油(92#)",
      "新加坡（FOB，中间价)无铅汽油(95#)",
      "鹿特丹（FOB,中间价）优质无铅汽油(95#)",
      "美国纽约港常规普通汽油",
      "美国墨西哥湾沿岸地区常规普通汽油",
      "美国洛杉矶RBOB普通汽油",
    ]],
    ["kerosene", "航空煤油", "refined_kerosene_spot_daily", "price", [
      "日本:C&F现货价:航空煤油",
      "阿拉伯湾:现货价(FOB):航空煤油",
      "地中海:现货价(FOB):航空煤油",
      "韩国:FOB现货价:航空煤油",
      "鹿特丹:FOB现货价:航空煤油",
      "新加坡:现货价(FOB,中间价):航空煤油",
      "新加坡:FOB(低端价):航空煤油",
      "新加坡:现货价(FOB,高端价):航空煤油",
    ]],
    ["fuel-oil", "燃料油", "refined_fuel_oil_spot_daily", "price", [
      "新加坡燃料油(高硫180)",
      "新加坡燃料油(高硫380)",
      "地中海燃料油(低硫180)",
      "鹿特丹燃料油(低硫180)",
      "西北欧燃料油(低硫180)",
      "西北欧燃料油(低硫180) [2]",
      "阿拉伯湾燃料油(高硫180)",
      "地中海燃料油(高硫180)",
      "鹿特丹燃料油(高硫180)",
      "西北欧燃料油(高硫180)",
      "西北欧燃料油(高硫180) [2]",
      "阿拉伯湾燃料油(高硫380)",
    ]],
    ["naphtha", "石脑油", "refined_naphtha_spot_daily", "price", [
      "日本(CFR,中间价)石脑油",
      "日本(CFR,低端价)石脑油",
      "日本(CFR,高端价)石脑油",
      "新加坡(FOB,中间价)石脑油",
      "新加坡(FOB,低端价)石脑油",
      "新加坡(FOB,高端价)石脑油",
      "阿拉伯湾石脑油现货价(FOB)",
      "阿拉伯湾石脑油现货价(LR2)",
      "韩国石脑油现货价(CFR)",
      "地中海石脑油现货价(FOB)",
      "鹿特丹(FOB,中间价)石脑油",
      "鹿特丹(FOB,低端价)石脑油",
      "鹿特丹(FOB,高端价)石脑油",
    ]],
  ];

  const compareGroups = [
    ["原油现货", "crude_spot_daily", "price", sections.crudeSpot.groups[0][2]],
    ["原油期货", "crude_futures_daily", "close_price", ["IPE布油期货（连续合约）", "WTI原油期货（连续合约）", "INE原油期货（连续合约）"]],
    ["成品油期货", "refined_futures_daily", "close_price", ["ICE柴油期货", "ICE柴油期货（活跃合约）", "INE低硫燃料油期货（连续）", "INE燃料油期货（连续）"]],
    ...productCats.map((item) => [`${item[1]}现货`, item[2], item[3], item[4]]),
  ];

  const demandForecastDataset = "crude_demand_forecast_quarterly";
  const demandForecastStartDate = "2025-10-01";
  const demandLines = [
    { label: "世界", seriesName: "全球:需求量:石油:预测值" },
    { label: "经合组织国家", seriesName: "经合组织国家:需求量:石油:预测值" },
    { label: "中国", seriesName: "中国:需求量:石油:预测值" },
  ];
  const opecProductionDataset = "opec_crude_production_monthly";
  const refineryUtilizationDataset = "refinery_utilization_monthly";
  const refinerySeriesOrder = [
    "\u7f8e\u56fd:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
    "\u5fb7\u56fd:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
    "\u6cd5\u56fd:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
    "\u82f1\u56fd:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
    "\u610f\u5927\u5229:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
    "\u65e5\u672c:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382",
  ];
  const opecPieColors = [
    "#4E79A7",
    "#F28E2B",
    "#E15759",
    "#76B7B2",
    "#59A14F",
    "#EDC948",
    "#B07AA1",
    "#FF9DA7",
    "#9C755F",
    "#BAB0AC",
    "#2F4B7C",
    "#D45087",
  ];

  let opecChart = null;
  let customChart = null;
  let demandChart = null;
  let lastExport = { headers: [], rows: [], fileName: "custom_spread.csv" };
  let optionsReady = false;
  const seriesCache = new Map();

  const fmt = (n) => Number.isFinite(Number(n)) ? Number(n).toFixed(2) : "--";
  const fmtSigned = (n) => Number.isFinite(Number(n)) ? `${Number(n) > 0 ? "+" : ""}${Number(n).toFixed(2)}` : "--";
  const fmtPct = (n) => Number.isFinite(Number(n)) ? `${fmtSigned(n)}%` : "--";
  const fmtVol = (n) => Number.isFinite(Number(n)) ? Number(n).toLocaleString("zh-CN") : "--";
  const esc = (s) => String(s == null ? "" : s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

  function j(url) {
    return fetch(url).then((r) => {
      if (!r.ok) throw new Error(`HTTP ${r.status}`);
      return r.json();
    });
  }

  function latestUrl(dataset, metric, names) {
    const p = new URLSearchParams({ dataset_code: dataset });
    if (metric) p.set("metric_key", metric);
    names.forEach((name) => p.append("series_name", name));
    return `${apiBase}/api/price-board/generic/latest?${p.toString()}`;
  }

  function seriesUrl(sel, startDate, endDate) {
    const p = new URLSearchParams({
      dataset_code: sel.datasetCode,
      series_name: sel.seriesName,
      metric_key: sel.metricKey,
      limit: "5000",
    });
    if (startDate) p.set("date_from", startDate);
    if (endDate) p.set("date_to", endDate);
    return `${apiBase}/api/price-board/generic/series?${p.toString()}`;
  }

  function sortByOrder(items, order) {
    const rank = new Map(order.map((name, index) => [name, index]));
    return [...items].sort((a, b) => (rank.get(a.series_name) ?? 999) - (rank.get(b.series_name) ?? 999));
  }

  function rowsHtml(items, futures) {
    if (!items.length) {
      return `<tr><td colspan="${futures ? 5 : 4}" style="text-align:center;color:var(--db-muted)">暂无本地数据</td></tr>`;
    }
    return items.map((item) => `
      <tr>
        <td>${esc(item.label || item.series_name)}</td>
        <td>${fmt(item.value)}</td>
        <td class="${Number(item.change || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtSigned(item.change)}</td>
        <td class="${Number(item.change_pct || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtPct(item.change_pct)}</td>
        ${futures ? `<td>${fmtVol(item.metrics && item.metrics.volume)}</td>` : ""}
      </tr>
    `).join("");
  }

  async function renderCrudeSpotSection() {
    const tbody = document.querySelector(`#${sections.crudeSpot.id} tbody`);
    if (!tbody) return;

    try {
      const [samplePayload, crudePayload] = await Promise.all([
        j(`${apiBase}/api/price-board/quotes`),
        j(latestUrl(
          sections.crudeSpot.groups[0][0],
          sections.crudeSpot.groups[0][1],
          sections.crudeSpot.groups[0][2]
        )),
      ]);

      const sampleItems = Array.isArray(samplePayload.items) ? samplePayload.items : [];
      const sampleBySymbol = new Map(
        sampleItems.map((item) => [String(item.symbol || "").toLowerCase(), item])
      );
      const mergedItems = [];

      const wtiItem = sampleBySymbol.get("wti");
      if (wtiItem) {
        mergedItems.push({
          label: "WTI现货",
          series_name: "WTI现货",
          value: wtiItem.close_price,
          change: wtiItem.change,
          change_pct: wtiItem.change_pct,
          metrics: { volume: wtiItem.volume },
        });
      }

      const brentItem = sampleBySymbol.get("brent");
      if (brentItem) {
        mergedItems.push({
          label: "Brent现货",
          series_name: "Brent现货",
          value: brentItem.close_price,
          change: brentItem.change,
          change_pct: brentItem.change_pct,
          metrics: { volume: brentItem.volume },
        });
      }

      const crudeItems = sortByOrder(
        Array.isArray(crudePayload.items) ? crudePayload.items : [],
        sections.crudeSpot.groups[0][2]
      );
      mergedItems.push(...crudeItems);

      tbody.innerHTML = rowsHtml(mergedItems, false);
    } catch (error) {
      console.warn("Failed to render crude spot section.", error);
      tbody.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--db-muted)">本地数据加载失败</td></tr>';
    }
  }

  async function renderSection(cfg) {
    const tbody = document.querySelector(`#${cfg.id} tbody`);
    if (!tbody) return;
    try {
      const groups = await Promise.all(cfg.groups.map(([dataset, metric, names]) => j(latestUrl(dataset, metric, names))));
      const items = groups.flatMap((payload, index) => sortByOrder(Array.isArray(payload.items) ? payload.items : [], cfg.groups[index][2]));
      tbody.innerHTML = rowsHtml(items, cfg.columns === "futures");
    } catch (error) {
      console.warn("Failed to render price-board section.", cfg.id, error);
      tbody.innerHTML = `<tr><td colspan="${cfg.columns === "futures" ? 5 : 4}" style="text-align:center;color:var(--db-muted)">本地数据加载失败</td></tr>`;
    }
  }

  function ensureProductCats() {
    const section = document.getElementById("db-products");
    if (!section) return;
    const menu = section.querySelector(".db-drop-menu");
    productCats.forEach(([key, label]) => {
      if (menu && !menu.querySelector(`[data-key="${key}"]`)) {
        const a = document.createElement("a");
        a.href = "javascript:void(0)";
        a.dataset.key = key;
        a.textContent = label;
        a.onclick = () => window.dbShowProduct && window.dbShowProduct(key);
        menu.appendChild(a);
      }
      if (!document.getElementById(`db-${key}`)) {
        const wrap = document.createElement("div");
        wrap.id = `db-${key}`;
        wrap.className = "db-product-tbl";
        wrap.style.display = "none";
        wrap.innerHTML = '<div class="db-tbl-wrap"><table class="db-tbl"><thead><tr><th>名称</th><th>现价</th><th>涨跌</th><th>涨跌幅</th></tr></thead><tbody><tr><td colspan="4" style="text-align:center;color:var(--db-muted)">暂无本地数据</td></tr></tbody></table></div>';
        section.appendChild(wrap);
      }
    });
  }

  async function renderProducts() {
    ensureProductCats();
    await Promise.all(productCats.map(async ([key, , dataset, metric, names]) => {
      const tbody = document.querySelector(`#db-${key} tbody`);
      if (!tbody) return;
      try {
        const payload = await j(latestUrl(dataset, metric, names));
        tbody.innerHTML = rowsHtml(sortByOrder(Array.isArray(payload.items) ? payload.items : [], names), false);
      } catch (error) {
        console.warn("Failed to render product table.", key, error);
      }
    }));
  }

  function setKlineOptions() {
    const select = document.getElementById("db-kline-product");
    if (!select) return;
    const value = select.value || "wti";
    select.innerHTML = '<option value="brent">布伦特原油</option><option value="wti">WTI原油</option>';
    select.value = value === "brent" ? "brent" : "wti";
  }

  function ensureCompareOptions() {
    if (optionsReady) return;
    const selects = [document.getElementById("db-type1"), document.getElementById("db-type2")].filter(Boolean);
    if (selects.length !== 2) return;
    selects.forEach((select) => {
      select.innerHTML = "";
      compareGroups.forEach(([label, dataset, metric, names]) => {
        const group = document.createElement("optgroup");
        group.label = label;
        names.forEach((name) => {
          const option = document.createElement("option");
          option.value = JSON.stringify({ datasetCode: dataset, metricKey: metric, seriesName: name });
          option.textContent = name;
          group.appendChild(option);
        });
        select.appendChild(group);
      });
    });
    selects[0].selectedIndex = 0;
    selects[1].selectedIndex = 1;
    optionsReady = true;
  }

  function parseSel(value) {
    try { return JSON.parse(value); } catch (error) { return null; }
  }

  async function loadSeries(sel, startDate, endDate) {
    const key = JSON.stringify([sel, startDate || "", endDate || ""]);
    if (!seriesCache.has(key)) {
      seriesCache.set(key, j(seriesUrl(sel, startDate, endDate)).then((payload) => (
        (Array.isArray(payload.rows) ? payload.rows : [])
          .map((row) => ({ date: row.trade_date, value: Number(row.value) }))
          .filter((row) => row.date && Number.isFinite(row.value))
      )));
    }
    return seriesCache.get(key);
  }

  function stats(rows) {
    if (!rows.length) return { latest: null, change: null, changePct: null };
    const latest = rows[rows.length - 1].value;
    const prev = rows.length > 1 ? rows[rows.length - 2].value : latest;
    const change = latest - prev;
    return { latest, change, changePct: prev ? (change / prev) * 100 : 0 };
  }

  function axis(rows1, rows2) {
    return [...new Set([...rows1.map((row) => row.date), ...rows2.map((row) => row.date)])].sort();
  }

  function values(dates, rows) {
    const map = new Map(rows.map((row) => [row.date, row.value]));
    return dates.map((date) => map.has(date) ? map.get(date) : null);
  }

  function csvEscape(value) {
    return `"${String(value == null ? "" : value).replace(/"/g, '""')}"`;
  }

  function exportCsv(fileName, headers, rows) {
    const blob = new Blob(["\ufeff", [headers, ...rows].map((row) => row.map(csvEscape).join(",")).join("\n")], { type: "text/csv;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = fileName;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function formatOpecMemberName(value) {
    return String(value || "")
      .replace(/:产量:原油$/u, "")
      .replace(/^OPEC[:：]/u, "")
      .trim();
  }

  function formatRefineryCountryName(value) {
    return String(value || "")
      .replace(/:\u5f00\u5de5\u7387:\u70bc\u6cb9\u5382$/u, "")
      .trim();
  }

  function formatQuarterLabel(value) {
    const text = String(value || "");
    const match = text.match(/^(\d{4})-(\d{2})/);
    if (!match) return text;
    const year = match[1];
    const month = Number(match[2]);
    const quarter = Math.floor((month - 1) / 3) + 1;
    return `${year}Q${quarter}`;
  }

  async function renderRefineryUtilization() {
    const tbody = document.getElementById("dbRefineryUtilizationBody");
    const asOfEl = document.getElementById("dbRefineryUtilizationAsOf");
    if (!tbody) return;
    try {
      const payload = await j(
        `${apiBase}/api/price-board/generic/latest?dataset_code=${encodeURIComponent(refineryUtilizationDataset)}&metric_key=value`
      );
      const latestItems = sortByOrder(
        (Array.isArray(payload.items) ? payload.items : []).filter((item) => Number.isFinite(Number(item.value))),
        refinerySeriesOrder
      );
      if (!latestItems.length) {
        tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--db-muted)">暂无本地数据</td></tr>';
        if (asOfEl) asOfEl.textContent = "";
        return;
      }

      const histories = await Promise.all(
        latestItems.map((item) => loadSeries({
          datasetCode: refineryUtilizationDataset,
          metricKey: "value",
          seriesName: item.series_name,
        }, "", ""))
      );

      tbody.innerHTML = latestItems.map((item, index) => {
        const summary = stats(histories[index]);
        const change = Number(summary.change);
        const changeClass = Number.isFinite(change) && change < 0 ? "db-neg" : "db-pos";
        return `
          <tr>
            <td>${esc(formatRefineryCountryName(item.series_name || item.label))}</td>
            <td>${fmt(item.value)}</td>
            <td class="${changeClass}">${Number.isFinite(change) ? `${fmtSigned(change)}%` : "--"}</td>
          </tr>
        `;
      }).join("");

      if (asOfEl) {
        asOfEl.textContent = payload.as_of ? `截至 ${String(payload.as_of).slice(0, 7)}` : "";
      }
    } catch (error) {
      console.warn("Failed to render refinery utilization table.", error);
      tbody.innerHTML = '<tr><td colspan="3" style="text-align:center;color:var(--db-muted)">本地数据加载失败</td></tr>';
      if (asOfEl) asOfEl.textContent = "";
    }
  }

  async function renderOpecPie() {
    const el = document.getElementById("dbOpecPie");
    if (!el || typeof echarts === "undefined") return;
    try {
      const payload = await j(`${apiBase}/api/price-board/generic/latest?dataset_code=${encodeURIComponent(opecProductionDataset)}&metric_key=value`);
      const items = (Array.isArray(payload.items) ? payload.items : [])
        .map((item) => ({
          ...item,
          value: Number(item.value),
          displayName: formatOpecMemberName(item.series_name || item.label),
        }))
        .filter((item) => item.displayName && Number.isFinite(item.value))
        .sort((left, right) => right.value - left.value);
      if (!items.length) return;

      const latestDate = String(payload.as_of || items[0].trade_date || "");
      opecChart = opecChart || echarts.getInstanceByDom(el) || echarts.init(el);
      opecChart.setOption({
        animation: false,
        backgroundColor: "transparent",
        color: opecPieColors,
        tooltip: {
          trigger: "item",
          backgroundColor: "rgba(18,18,20,.95)",
          borderColor: "rgba(214,179,106,.30)",
          textStyle: { color: "#f6e3b2" },
          formatter: (params) => `${params.name}<br/>${fmt(params.value)} 千桶/日 (${params.percent}%)`,
        },
        series: [{
          id: "opec-production",
          name: "欧佩克成员国原油产量",
          type: "pie",
          radius: ["38%", "63%"],
          center: ["50%", "54%"],
          minAngle: 2,
          minShowLabelAngle: 2,
          avoidLabelOverlap: true,
          label: {
            show: true,
            color: "#f6e3b2",
            fontSize: 10,
            formatter: (params) => (params.percent >= 2.2 ? params.name : ""),
          },
          labelLine: {
            show: true,
            length: 12,
            length2: 10,
            lineStyle: { color: "#d6b36a", width: 1.2 },
          },
          itemStyle: {
            borderColor: "rgba(10,12,18,.95)",
            borderWidth: 2,
          },
          labelLayout: {
            hideOverlap: true,
            moveOverlap: "shiftY",
          },
          data: items.map((item, index) => ({
            name: item.displayName,
            value: item.value,
            itemStyle: { color: opecPieColors[index % opecPieColors.length] },
          })),
        }],
      }, { notMerge: true });
    } catch (error) {
      console.warn("Failed to render OPEC production pie chart.", error);
    }
  }

  async function renderDemand() {
    const el = document.getElementById("dbDemandBar");
    if (!el || typeof echarts === "undefined") return;
    try {
      const lines = await Promise.all(
        demandLines.map((item) => loadSeries({
          datasetCode: demandForecastDataset,
          metricKey: "value",
          seriesName: item.seriesName,
        }, demandForecastStartDate, ""))
      );
      const dates = [...new Set(lines.flatMap((rows) => rows.map((row) => row.date)))].sort();
      if (!dates.length) return;
      demandChart = demandChart || echarts.getInstanceByDom(el) || echarts.init(el);
      demandChart.setOption({
        animation: false,
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          backgroundColor: "rgba(18,18,20,.95)",
          borderColor: "rgba(214,179,106,.30)",
          textStyle: { color: "#f6e3b2" },
          formatter: (params) => {
            const rows = Array.isArray(params) ? params : [params];
            if (!rows.length) return "";
            const title = formatQuarterLabel(rows[0].axisValue);
            return [
              title,
              ...rows.map((row) => `${row.marker}${row.seriesName}: ${fmt(row.value)} 百万桶/天`),
            ].join("<br/>");
          },
        },
        legend: { data: demandLines.map((item) => item.label), textStyle: { color: "#f6e3b2", fontSize: 11 }, bottom: 0 },
        grid: { left: "4%", right: "4%", top: "10%", bottom: "18%", containLabel: true },
        xAxis: {
          type: "category",
          data: dates,
          axisLabel: { color: "rgba(240,240,242,.50)", formatter: (v) => formatQuarterLabel(v) },
          splitLine: { show: false },
        },
        yAxis: {
          scale: true,
          name: "百万桶/天",
          nameTextStyle: { color: "rgba(240,240,242,.58)" },
          axisLabel: { color: "rgba(240,240,242,.50)" },
          splitLine: { lineStyle: { color: "rgba(214,179,106,.08)" } },
        },
        series: demandLines.map((item, i) => ({
          name: item.label,
          type: "line",
          smooth: true,
          symbol: "circle",
          symbolSize: 6,
          data: values(dates, lines[i]),
          lineStyle: { width: 2.4, color: ["#d6b36a", "#f6e3b2", "#7fb8d8"][i] },
          itemStyle: { color: ["#d6b36a", "#f6e3b2", "#7fb8d8"][i] },
        })),
      }, { notMerge: true });
    } catch (error) {
      console.warn("Failed to render demand forecast chart.", error);
    }
  }

  const prevOpen = window.dbOpenModal;
  window.dbOpenModal = function () {
    if (typeof prevOpen === "function") prevOpen();
    ensureCompareOptions();
    const btn = document.querySelector("#db-custom-modal .db-chart-wrap .db-modal-btn");
    if (btn) btn.textContent = "导出数据";
  };

  window.dbRenderCustom = async function () {
    ensureCompareOptions();
    const startDate = document.getElementById("db-start-date")?.value || "";
    const endDate = document.getElementById("db-end-date")?.value || "";
    const t1 = document.getElementById("db-type1");
    const t2 = document.getElementById("db-type2");
    const body = document.getElementById("db-modal-tbody");
    const el = document.getElementById("dbCustomLineChart");
    if (!t1 || !t2 || !body || !el) return;
    const s1 = parseSel(t1.value);
    const s2 = parseSel(t2.value);
    if (!s1 || !s2) return;
    try {
      const [r1, r2] = await Promise.all([loadSeries(s1, startDate, endDate), loadSeries(s2, startDate, endDate)]);
      const a1 = stats(r1), a2 = stats(r2);
      const spread = Number.isFinite(a1.latest) && Number.isFinite(a2.latest) ? a1.latest - a2.latest : null;
      body.innerHTML = `
        <tr><td>${esc(t1.options[t1.selectedIndex].text)}</td><td>${fmt(a1.latest)}</td><td class="${Number(a1.change || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtSigned(a1.change)}</td><td class="${Number(a1.changePct || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtPct(a1.changePct)}</td></tr>
        <tr><td>${esc(t2.options[t2.selectedIndex].text)}</td><td>${fmt(a2.latest)}</td><td class="${Number(a2.change || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtSigned(a2.change)}</td><td class="${Number(a2.changePct || 0) >= 0 ? "db-pos" : "db-neg"}">${fmtPct(a2.changePct)}</td></tr>
        <tr><td>价差</td><td colspan="3">${fmt(spread)}</td></tr>`;
      const dates = axis(r1, r2);
      const v1 = values(dates, r1), v2 = values(dates, r2);
      const nums = [...v1, ...v2].filter((n) => Number.isFinite(n));
      const min = nums.length ? Math.min(...nums) : null;
      const max = nums.length ? Math.max(...nums) : null;
      const pad = min == null || max == null ? null : ((max - min) || Math.abs(max) || 1) * 0.12;
      customChart = customChart || echarts.init(el);
      customChart.setOption({
        animation: false,
        backgroundColor: "transparent",
        tooltip: { trigger: "axis", backgroundColor: "rgba(18,18,20,.95)", borderColor: "rgba(214,179,106,.30)", textStyle: { color: "#f6e3b2" } },
        legend: { data: [t1.options[t1.selectedIndex].text, t2.options[t2.selectedIndex].text], textStyle: { color: "#f6e3b2" }, bottom: 0 },
        grid: { left: "3%", right: "4%", bottom: "15%", top: "10%", containLabel: true },
        xAxis: { type: "category", boundaryGap: false, data: dates, axisLabel: { color: "rgba(240,240,242,.50)", fontSize: 10, formatter: (v) => String(v).slice(5) }, splitLine: { show: false } },
        yAxis: { scale: true, min: min == null ? null : +(min - pad).toFixed(2), max: max == null ? null : +(max + pad).toFixed(2), axisLabel: { color: "rgba(240,240,242,.50)", fontSize: 10 }, splitLine: { lineStyle: { color: "rgba(214,179,106,.08)" } } },
        series: [
          { id: "custom1", name: t1.options[t1.selectedIndex].text, type: "line", data: v1, smooth: true, connectNulls: true, symbol: "none", lineStyle: { color: "#d6b36a", width: 2 }, areaStyle: { color: "rgba(214,179,106,.08)" } },
          { id: "custom2", name: t2.options[t2.selectedIndex].text, type: "line", data: v2, smooth: true, connectNulls: true, symbol: "none", lineStyle: { color: "#f6e3b2", width: 2 }, areaStyle: { color: "rgba(246,227,178,.06)" } },
        ],
      }, { notMerge: true });
      lastExport = {
        headers: ["日期", t1.options[t1.selectedIndex].text, t2.options[t2.selectedIndex].text, "价差"],
        rows: dates.map((date, i) => [date, Number.isFinite(v1[i]) ? Number(v1[i]).toFixed(2) : "", Number.isFinite(v2[i]) ? Number(v2[i]).toFixed(2) : "", Number.isFinite(v1[i]) && Number.isFinite(v2[i]) ? (v1[i] - v2[i]).toFixed(2) : ""]),
        fileName: `custom_spread_${Date.now()}.csv`,
      };
    } catch (error) {
      console.warn("Failed to render custom compare from SQLite data.", error);
      body.innerHTML = '<tr><td colspan="4" style="text-align:center;color:var(--db-muted)">当前条件下无法加载数据</td></tr>';
    }
  };

  window.dbDownloadChart = function () {
    if (!lastExport.rows.length) {
      alert("请先点击查询，再导出数据。");
      return;
    }
    exportCsv(lastExport.fileName, lastExport.headers, lastExport.rows);
  };

  const prevInit = window.initDatabaseView;
  window.initDatabaseView = function () {
    if (typeof prevInit === "function") prevInit();
    setTimeout(() => {
      setKlineOptions();
      Promise.all([
        renderCrudeSpotSection(),
        renderSection(sections.futuresIntl),
        renderOpecPie(),
        renderProducts(),
        renderDemand(),
        renderRefineryUtilization(),
      ]).catch((error) => console.warn("Failed to refresh price-board real data.", error));
    }, 220);
    setTimeout(() => {
      renderOpecPie().catch((error) => console.warn("Failed to reapply OPEC production pie chart.", error));
    }, 1850);
  };
})();
