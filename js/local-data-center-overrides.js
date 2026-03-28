(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");

  const realSymbolMap = new Map([
    ["WTI\u539f\u6cb9\u73b0\u8d27\u4ef7", "WTI"],
    ["WTI\u539f\u6cb9\u671f\u8d27\u6536\u76d8\u4ef7", "WTI"],
    ["\u5e03\u4f26\u7279\u539f\u6cb9\u73b0\u8d27\u4ef7", "Brent"],
    ["\u5e03\u4f26\u7279\u539f\u6cb9\u671f\u8d27\u6536\u76d8\u4ef7", "Brent"],
  ]);
  const freqDay = "\u65e5";
  const freqWeek = "\u5468";
  const freqMonth = "\u6708";
  const freqYear = "\u5e74";
  const marketCache = new Map();
  const marketLoads = new Map();
  const originalGenerateMockData = typeof window.generateMockData === "function"
    ? window.generateMockData
    : null;

  function fetchJson(url) {
    return fetch(url).then((response) => {
      if (!response.ok) throw new Error(`HTTP ${response.status}`);
      return response.json();
    });
  }

  function parseTradeDate(value) {
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

  function normalizeRows(rows) {
    return (Array.isArray(rows) ? rows : [])
      .map((row) => ({
        tradeDate: String(row.trade_date || ""),
        closePrice: Number(row.close_price),
      }))
      .filter((row) => row.tradeDate && Number.isFinite(row.closePrice))
      .sort((left, right) => left.tradeDate.localeCompare(right.tradeDate));
  }

  function sliceTenYears(rows) {
    if (!rows.length) return [];
    const latestDate = parseTradeDate(rows[rows.length - 1].tradeDate);
    const cutoff = new Date(latestDate);
    cutoff.setFullYear(cutoff.getFullYear() - 10);
    return rows.filter((row) => parseTradeDate(row.tradeDate) >= cutoff);
  }

  function finalizeSeries(rows, count) {
    const trimmed = typeof count === "number" ? rows.slice(-count) : rows;
    return trimmed.map((row) => ({
      date: row.date,
      value: Number(row.value).toFixed(2),
    }));
  }

  function resampleRows(rows, freq) {
    if (freq === freqWeek) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(toWeekKey(parseTradeDate(row.tradeDate)), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.closePrice }));
    }

    if (freq === freqMonth) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(toMonthKey(parseTradeDate(row.tradeDate)), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.closePrice }));
    }

    if (freq === freqYear) {
      const buckets = new Map();
      rows.forEach((row) => {
        buckets.set(String(parseTradeDate(row.tradeDate).getFullYear()), row);
      });
      return Array.from(buckets.entries())
        .sort((left, right) => left[0].localeCompare(right[0]))
        .map(([date, row]) => ({ date, value: row.closePrice }));
    }

    return rows.map((row) => ({
      date: row.tradeDate,
      value: row.closePrice,
    }));
  }

  function buildRealSeries(name, freq, count) {
    const symbol = realSymbolMap.get(name);
    if (!symbol) return null;
    const cachedRows = marketCache.get(symbol);
    if (!cachedRows || !cachedRows.length) return null;
    return finalizeSeries(resampleRows(sliceTenYears(cachedRows), freq), count);
  }

  function refreshSelectedSeries(symbol) {
    if (typeof selectedDataList === "undefined" || !Array.isArray(selectedDataList)) return;
    if (typeof renderSelectedData !== "function") return;

    let changed = false;
    selectedDataList.forEach((item) => {
      if (realSymbolMap.get(item.name) !== symbol) return;
      const realRows = buildRealSeries(item.name, item.freq);
      if (!realRows || !realRows.length) return;
      item.renderedData = realRows;
      item.renderedFreq = item.freq;
      changed = true;
    });

    if (changed) renderSelectedData();
  }

  function ensureSeries(symbol) {
    if (marketCache.has(symbol)) return Promise.resolve(marketCache.get(symbol));
    if (marketLoads.has(symbol)) return marketLoads.get(symbol);

    const request = fetchJson(
      `${apiBase}/api/market/series?symbol=${encodeURIComponent(symbol)}&limit=5000`
    )
      .then((payload) => {
        const normalized = normalizeRows(payload && payload.rows);
        marketCache.set(symbol, normalized);
        marketLoads.delete(symbol);
        refreshSelectedSeries(symbol);
        return normalized;
      })
      .catch((error) => {
        marketLoads.delete(symbol);
        console.warn(`Failed to load local data-center series for ${symbol}.`, error);
        return [];
      });

    marketLoads.set(symbol, request);
    return request;
  }

  if (originalGenerateMockData) {
    window.generateMockData = function (name, freq, count) {
      const symbol = realSymbolMap.get(name);
      if (!symbol) return originalGenerateMockData(name, freq, count);

      const realRows = buildRealSeries(name, freq, count);
      if (realRows && realRows.length) return realRows;

      void ensureSeries(symbol);
      return originalGenerateMockData(name, freq, count);
    };
  }

  void ensureSeries("WTI");
  void ensureSeries("Brent");
})();
