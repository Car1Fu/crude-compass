(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");

  const freqDay = "日";
  const freqWeek = "周";
  const freqMonth = "月";
  const freqYear = "年";

  const originalGenerateMockData = typeof window.generateMockData === "function"
    ? window.generateMockData
    : null;
  const originalGetSource = typeof window.getSource === "function"
    ? window.getSource
    : null;

  const dataConfigMap = new Map();
  const seriesCache = new Map();
  const seriesLoads = new Map();
  const sourceLabels = {
    wtiSpot: "EIA",
    brentSpot: "ICE Futures Europe",
    crudeSpot: "Platts",
    wtiFuture: "NYMEX",
    brentFuture: "ICE Futures Europe",
    shanghaiFuture: "上海国际能源交易中心",
    refinedFuturesIntl: "ICE Futures Europe",
    refinedFuturesShanghai: "上海国际能源交易中心",
    gasolineSpot: "Platts",
    dieselSpot: "Platts",
    keroseneSpot: "Argus",
    fuelOilSpot: "Platts",
    naphthaSpot: "Platts",
    opecDemand: "OPEC",
    fallback: "Wind",
  };

  function makeMarketEntry(name, symbol, sectionKey, source, unit = "美元/桶") {
    return {
      name,
      category: "price",
      freq: freqDay,
      unit,
      sectionKey,
      source,
      loader: {
        kind: "market",
        symbol,
      },
    };
  }

  function makeGenericEntry(
    name,
    datasetCode,
    seriesName,
    sectionKey,
    source,
    {
      category = "price",
      freq = freqDay,
      unit = "原始单位",
      metricKey = "price",
    } = {}
  ) {
    return {
      name,
      category,
      freq,
      unit,
      sectionKey,
      source,
      loader: {
        kind: "generic",
        datasetCode,
        seriesName,
        metricKey,
      },
    };
  }

  const realEntries = [
    makeMarketEntry("WTI原油现货价", "WTI", "price-crude", sourceLabels.wtiSpot),
    makeMarketEntry("布伦特原油现货价", "Brent", "price-crude", sourceLabels.brentSpot),
    makeGenericEntry("迪拜原油现货价", "crude_spot_daily", "阿联酋迪拜原油", "price-crude", sourceLabels.crudeSpot, { unit: "美元/桶" }),
    makeGenericEntry("WTI原油期货收盘价", "crude_futures_daily", "WTI原油期货（连续合约）", "price-futures", sourceLabels.wtiFuture, {
      metricKey: "close_price",
      unit: "美元/桶",
    }),
    makeGenericEntry("布伦特原油期货收盘价", "crude_futures_daily", "IPE布油期货（连续合约）", "price-futures", sourceLabels.brentFuture, {
      metricKey: "close_price",
      unit: "美元/桶",
    }),
    makeGenericEntry("上海原油期货结算价", "crude_futures_daily", "INE原油期货（连续合约）", "price-futures", sourceLabels.shanghaiFuture, {
      metricKey: "settlement_price",
      unit: "美元/桶",
    }),
    makeGenericEntry("汽油现货价", "refined_gasoline_spot_daily", "新加坡（FOB，中间价)无铅汽油(95#)", "price-products", sourceLabels.gasolineSpot),
    makeGenericEntry("柴油现货价", "refined_diesel_spot_daily", "新加坡(FOB,中间价)柴油(含硫0.05%)", "price-products", sourceLabels.dieselSpot),
    makeGenericEntry("燃料油现货价", "refined_fuel_oil_spot_daily", "新加坡燃料油(高硫180)", "price-products", sourceLabels.fuelOilSpot),
    makeGenericEntry("航空煤油现货价", "refined_kerosene_spot_daily", "新加坡:现货价(FOB,中间价):航空煤油", "price-products", sourceLabels.keroseneSpot),
    makeGenericEntry("全球石油消费", "opec_consumption_forecast", "全球:需求量:石油:预测值", "supply-demand", sourceLabels.opecDemand, {
      category: "supply",
      freq: freqMonth,
    }),
    makeGenericEntry("中国石油消费", "opec_consumption_forecast", "中国:需求量:石油:预测值", "supply-demand", sourceLabels.opecDemand, {
      category: "supply",
      freq: freqMonth,
    }),
    makeGenericEntry("经合组织国家石油需求预测", "opec_consumption_forecast", "经合组织国家:需求量:石油:预测值", "supply-demand", sourceLabels.opecDemand, {
      category: "supply",
      freq: freqMonth,
    }),

    ...[
      "英国布伦特Dtd原油",
      "布伦特原油现货离岸价",
      "美国西德克萨斯中级轻质原油(WTI)",
      "西德克萨斯中级轻质原油(WTI)现货离岸价",
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
    ].map((name) => makeGenericEntry(name, "crude_spot_daily", name, "price-crude", sourceLabels.crudeSpot, {
      unit: "美元/桶",
    })),

    ...[
      "IPE布油期货（连续合约）",
      "WTI原油期货（连续合约）",
    ].map((name) => makeGenericEntry(
      name,
      "crude_futures_daily",
      name,
      "price-futures",
      name.includes("WTI") ? sourceLabels.wtiFuture : sourceLabels.brentFuture,
      {
      metricKey: "close_price",
      unit: "美元/桶",
    })),
    makeGenericEntry("INE原油期货（连续合约）", "crude_futures_daily", "INE原油期货（连续合约）", "price-futures", sourceLabels.shanghaiFuture, {
      metricKey: "close_price",
      unit: "美元/桶",
    }),
    makeGenericEntry("INE原油期货（连续合约）结算价", "crude_futures_daily", "INE原油期货（连续合约）", "price-futures", sourceLabels.shanghaiFuture, {
      metricKey: "settlement_price",
      unit: "美元/桶",
    }),

    ...[
      "ICE柴油期货",
      "ICE柴油期货（活跃合约）",
      "INE低硫燃料油期货（1月交割连续）",
      "INE低硫燃料油期货（5月交割连续）",
      "INE低硫燃料油期货（9月交割连续）",
      "INE低硫燃料油期货（活跃合约）",
      "INE低硫燃料油期货（连续）",
      "INE燃料油期货(1月交割连续)",
      "INE燃料油期货(5月交割连续)",
      "INE燃料油期货(9月交割连续)",
      "INE燃料油期货（活跃合约）",
      "INE燃料油期货（连续）",
    ].map((name) => makeGenericEntry(
      name,
      "refined_futures_daily",
      name,
      "price-futures",
      name.startsWith("ICE") ? sourceLabels.refinedFuturesIntl : sourceLabels.refinedFuturesShanghai,
      {
      metricKey: "close_price",
    })),

    ...[
      "新加坡(FOB,中间价)柴油(含硫0.05%)",
      "新加坡(FOB,中间价)柴油(含硫0.5%)",
      "新加坡(FOB,低端价)柴油(含硫0.05%)",
      "新加坡(FOB,低端价)柴油(含硫0.5%)",
      "新加坡(FOB,高端价)柴油(含硫0.05%)",
      "新加坡(FOB,高端价)柴油(含硫0.5%)",
      "美国:洛杉矶超低硫CARB柴油",
      "美国:海湾地区超低硫2号柴油",
      "美国：纽约港超低硫2号柴油",
      "鹿特丹(FOB,中间价)柴油(含硫0.05%)",
      "鹿特丹(FOB,低端价)柴油(含硫0.05%)",
      "鹿特丹(FOB,高端价)柴油(含硫0.05%)",
    ].map((name) => makeGenericEntry(name, "refined_diesel_spot_daily", name, "price-products", sourceLabels.dieselSpot)),

    ...[
      "新加坡（FOB，中间价)无铅汽油(95#)",
      "新加坡（FOB，低端价)无铅汽油(92#)",
      "美国墨西哥湾沿岸地区常规普通汽油",
      "美国洛杉矶RBOB普通汽油",
      "美国纽约港常规普通汽油",
      "鹿特丹（FOB,中间价）优质无铅汽油(95#)",
    ].map((name) => makeGenericEntry(name, "refined_gasoline_spot_daily", name, "price-products", sourceLabels.gasolineSpot)),

    ...[
      "地中海:现货价(FOB):航空煤油",
      "新加坡:FOB(低端价):航空煤油",
      "新加坡:现货价(FOB,中间价):航空煤油",
      "新加坡:现货价(FOB,高端价):航空煤油",
      "日本:C&F现货价:航空煤油",
      "阿拉伯湾:现货价(FOB):航空煤油",
      "韩国:FOB现货价:航空煤油",
      "鹿特丹:FOB现货价:航空煤油",
    ].map((name) => makeGenericEntry(name, "refined_kerosene_spot_daily", name, "price-products", sourceLabels.keroseneSpot)),

    ...[
      "地中海燃料油(低硫180)",
      "地中海燃料油(高硫180)",
      "新加坡燃料油(高硫180)",
      "新加坡燃料油(高硫380)",
      "西北欧燃料油(低硫180)",
      "西北欧燃料油(低硫180) [2]",
      "西北欧燃料油(高硫180)",
      "西北欧燃料油(高硫180) [2]",
      "阿拉伯湾燃料油(高硫180)",
      "阿拉伯湾燃料油(高硫380)",
      "鹿特丹燃料油(低硫180)",
      "鹿特丹燃料油(高硫180)",
    ].map((name) => makeGenericEntry(name, "refined_fuel_oil_spot_daily", name, "price-products", sourceLabels.fuelOilSpot)),

    ...[
      "地中海石脑油现货价(FOB)",
      "新加坡(FOB,中间价)石脑油",
      "新加坡(FOB,低端价)石脑油",
      "新加坡(FOB,高端价)石脑油",
      "日本(CFR,中间价)石脑油",
      "日本(CFR,低端价)石脑油",
      "日本(CFR,高端价)石脑油",
      "阿拉伯湾石脑油现货价(FOB)",
      "阿拉伯湾石脑油现货价(LR2)",
      "韩国石脑油现货价(CFR)",
      "鹿特丹(FOB,中间价)石脑油",
      "鹿特丹(FOB,低端价)石脑油",
      "鹿特丹(FOB,高端价)石脑油",
    ].map((name) => makeGenericEntry(name, "refined_naphtha_spot_daily", name, "price-products", sourceLabels.naphthaSpot)),

    ...[
      "中国:需求量:石油:预测值",
      "全球:需求量:石油:预测值",
      "其他欧洲地区:需求量:石油:预测值",
      "经合组织:亚太地区:预期日消费量:战略储备石油",
      "经合组织:亚太地区:预期日消费量:陆上商业石油",
      "经合组织:欧洲:预期日消费量:战略储备石油",
      "经合组织:欧洲:预期日消费量:陆上商业石油",
      "经合组织:美洲:预期日消费量:战略储备石油",
      "经合组织:美洲:预期日消费量:陆上商业石油",
      "经合组织:预期日消费量:战略储备石油",
      "经合组织:预期日消费量:陆上商业石油",
      "经合组织:预期日消费量:陆上商业石油及战略储备石油",
      "经合组织亚太地区国家:需求量:石油:预测值",
      "经合组织国家:需求量:石油:预测值",
      "经合组织欧洲国家:需求量:石油:预测值",
      "经合组织美洲国家:需求量:石油:预测值",
    ].map((name) => makeGenericEntry(name, "opec_consumption_forecast", name, "supply-demand", sourceLabels.opecDemand, {
      category: "supply",
      freq: freqMonth,
    })),
  ];

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  function parseTradeDate(value) {
    if (/^\d{4}$/.test(String(value))) {
      return new Date(`${value}-01-01T12:00:00`);
    }
    const parsed = new Date(`${value}T12:00:00`);
    return Number.isNaN(parsed.getTime()) ? new Date(value) : parsed;
  }

  function toIsoDate(date) {
    return [
      date.getFullYear(),
      String(date.getMonth() + 1).padStart(2, "0"),
      String(date.getDate()).padStart(2, "0"),
    ].join("-");
  }

  function toMonthKey(date) {
    return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, "0")}-01`;
  }

  function toWeekKey(date) {
    const monday = new Date(date);
    const offset = (monday.getDay() + 6) % 7;
    monday.setDate(monday.getDate() - offset);
    return toIsoDate(monday);
  }

  function normalizeRows(rows, valueSelector) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        tradeDate: String(row.trade_date || ""),
        value: Number(valueSelector(row)),
      }))
      .filter((row) => row.tradeDate && Number.isFinite(row.value))
      .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));
  }

  function sliceTenYears(rows) {
    if (!rows.length) return [];
    const latestDate = parseTradeDate(rows[rows.length - 1].tradeDate);
    const cutoff = new Date(latestDate);
    cutoff.setFullYear(cutoff.getFullYear() - 10);
    return rows.filter((row) => parseTradeDate(row.tradeDate) >= cutoff);
  }

  function resampleRows(rows, freq) {
    if (freq === freqWeek) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(toWeekKey(parseTradeDate(row.tradeDate)), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.value }));
    }

    if (freq === freqMonth) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(toMonthKey(parseTradeDate(row.tradeDate)), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.value }));
    }

    if (freq === freqYear) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(String(parseTradeDate(row.tradeDate).getFullYear()), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.value }));
    }

    return rows.map((row) => ({
      date: row.tradeDate,
      value: row.value,
    }));
  }

  function finalizeSeries(rows, count) {
    const trimmed = typeof count === "number" ? rows.slice(-count) : rows;
    return trimmed.map((row) => ({
      date: row.date,
      value: Number(row.value).toFixed(2),
    }));
  }

  function buildCacheKey(entry) {
    if (entry.loader.kind === "market") {
      return `market:${entry.loader.symbol}`;
    }
    return [
      "generic",
      entry.loader.datasetCode,
      entry.loader.seriesName,
      entry.loader.metricKey,
    ].join(":");
  }

  function buildRealSeries(name, freq, count) {
    const entry = dataConfigMap.get(name);
    if (!entry) return null;

    const cacheKey = buildCacheKey(entry);
    const cachedRows = seriesCache.get(cacheKey);
    if (!cachedRows || !cachedRows.length) return null;

    return finalizeSeries(resampleRows(sliceTenYears(cachedRows), freq), count);
  }

  function refreshSelectedSeries(name) {
    if (typeof selectedDataList === "undefined" || !Array.isArray(selectedDataList)) return;
    if (typeof renderSelectedData !== "function") return;

    let changed = false;
    selectedDataList.forEach((item) => {
      if (item.name !== name) return;
      const realRows = buildRealSeries(item.name, item.freq);
      if (!realRows || !realRows.length) return;
      item.renderedData = realRows;
      item.renderedFreq = item.freq;
      changed = true;
    });

    if (changed) renderSelectedData();
  }

  function ensureSeries(name) {
    const entry = dataConfigMap.get(name);
    if (!entry) return Promise.resolve([]);

    const cacheKey = buildCacheKey(entry);
    if (seriesCache.has(cacheKey)) return Promise.resolve(seriesCache.get(cacheKey));
    if (seriesLoads.has(cacheKey)) return seriesLoads.get(cacheKey);

    const request = (entry.loader.kind === "market"
      ? fetchJson(
          `${apiBase}/api/market/series?symbol=${encodeURIComponent(entry.loader.symbol)}&limit=5000`
        ).then((payload) => normalizeRows(payload && payload.rows, (row) => row.close_price))
      : fetchJson(
          `${apiBase}/api/price-board/generic/series?dataset_code=${encodeURIComponent(entry.loader.datasetCode)}&series_name=${encodeURIComponent(entry.loader.seriesName)}&metric_key=${encodeURIComponent(entry.loader.metricKey)}&limit=5000`
        ).then((payload) => normalizeRows(payload && payload.rows, (row) => row.value))
    )
      .then((rows) => {
        seriesCache.set(cacheKey, rows);
        seriesLoads.delete(cacheKey);
        refreshSelectedSeries(name);
        return rows;
      })
      .catch((error) => {
        seriesLoads.delete(cacheKey);
        console.warn(`Failed to load local data-center series for ${name}.`, error);
        return [];
      });

    seriesLoads.set(cacheKey, request);
    return request;
  }

  function getSectionContainer(sectionKey) {
    if (sectionKey === "price-crude") {
      return document.querySelectorAll('.category-item[data-category="price"] .category-children > .subcategory-children')[0] || null;
    }
    if (sectionKey === "price-products") {
      return document.querySelectorAll('.category-item[data-category="price"] .category-children > .subcategory-children')[1] || null;
    }
    if (sectionKey === "price-futures") {
      return document.querySelectorAll('.category-item[data-category="price"] .category-children > .subcategory-children')[2] || null;
    }
    if (sectionKey === "supply-demand") {
      return document.querySelectorAll('.category-item[data-category="supply"] .category-children > .subcategory-children')[3] || null;
    }
    return null;
  }

  function applyMetaToItem(item, entry) {
    item.dataset.name = entry.name;
    item.dataset.category = entry.category;
    item.dataset.freq = entry.freq;
    item.dataset.unit = entry.unit;
    item.dataset.key = typeof getDataKey === "function"
      ? getDataKey(entry.name, entry.category, entry.unit)
      : [entry.name, entry.category, entry.unit].join("||");

    const nameEl = item.querySelector(".data-item-name");
    if (nameEl) nameEl.textContent = entry.name;
    const freqEl = item.querySelector(".data-item-freq");
    if (freqEl) freqEl.textContent = typeof getFreqLabel === "function" ? getFreqLabel(entry.freq) : entry.freq;
    const sourceEl = item.querySelector(".data-item-source");
    if (sourceEl) sourceEl.textContent = entry.source;
    const addBtn = item.querySelector(".data-item-add");
    if (addBtn) {
      addBtn.setAttribute("aria-label", `添加 ${entry.name}`);
      addBtn.setAttribute("title", `添加 ${entry.name}`);
    }
  }

  function buildDataItem(entry) {
    const item = document.createElement("div");
    item.className = "data-item";

    const addBtn = document.createElement("button");
    addBtn.type = "button";
    addBtn.className = "data-item-add";
    addBtn.textContent = "+";

    const content = document.createElement("div");
    content.className = "data-item-main";

    const nameEl = document.createElement("span");
    nameEl.className = "data-item-name";

    const meta = document.createElement("div");
    meta.className = "data-item-meta";

    const sourceEl = document.createElement("span");
    sourceEl.className = "data-item-source";

    const freqEl = document.createElement("span");
    freqEl.className = "data-item-freq";

    meta.appendChild(sourceEl);
    meta.appendChild(freqEl);
    content.appendChild(nameEl);
    content.appendChild(meta);
    item.appendChild(addBtn);
    item.appendChild(content);

    applyMetaToItem(item, entry);

    addBtn.addEventListener("click", function (event) {
      event.stopPropagation();
      if (typeof selectedDataList !== "undefined" && selectedDataList.some((data) => data.key === item.dataset.key)) {
        if (typeof removeSelectedDataByKey === "function") removeSelectedDataByKey(item.dataset.key);
        return;
      }
      if (typeof addDataFromItem === "function") addDataFromItem(item);
    });

    item.addEventListener("click", function () {
      if (typeof showDataFromItem === "function") showDataFromItem(item);
    });

    return item;
  }

  function registerSidebarItem(entry) {
    const container = getSectionContainer(entry.sectionKey);
    if (!container) return;

    let item = Array.from(container.querySelectorAll(".data-item")).find((node) => {
      const nameEl = node.querySelector(".data-item-name");
      return node.dataset.name === entry.name || (nameEl && nameEl.textContent === entry.name);
    });

    if (!item) {
      item = buildDataItem(entry);
      container.appendChild(item);
    } else {
      applyMetaToItem(item, entry);
    }
  }

  function registerAllSidebarItems() {
    realEntries.forEach((entry) => {
      dataConfigMap.set(entry.name, entry);
      registerSidebarItem(entry);
    });
    if (typeof updateSidebarSelectionState === "function") updateSidebarSelectionState();
  }

  window.getSource = function (name) {
    const entry = dataConfigMap.get(name);
    if (entry) return entry.source;
    return originalGetSource ? originalGetSource(name) : sourceLabels.fallback;
  };

  if (originalGenerateMockData) {
    window.generateMockData = function (name, freq, count) {
      if (!dataConfigMap.has(name)) {
        return originalGenerateMockData(name, freq, count);
      }

      const realRows = buildRealSeries(name, freq, count);
      if (realRows && realRows.length) return realRows;

      void ensureSeries(name);
      return originalGenerateMockData(name, freq, count);
    };
  }

  registerAllSidebarItems();

  [
    "WTI原油现货价",
    "布伦特原油现货价",
    "WTI原油期货收盘价",
    "布伦特原油期货收盘价",
    "上海原油期货结算价",
    "全球石油消费",
    "中国石油消费",
  ].forEach((name) => {
    void ensureSeries(name);
  });
})();
