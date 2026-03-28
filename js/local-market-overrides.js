(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");
  const maxVisibleKlinePoints = 300;

  let klineRequestToken = 0;
  const customSeriesCache = new Map();
  const customSeriesLoads = new Map();
  let customDateInputsBound = false;
  let customDateBounds = null;
  let customCompareChart = null;
  let lastCustomExport = {
    headers: [],
    rows: [],
    fileName: "custom-spread-data.csv",
  };

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function escapeCsv(value) {
    const text = value == null ? "" : String(value);
    return `"${text.replace(/"/g, '""')}"`;
  }

  function downloadCsv(fileName, headers, rows) {
    const lines = [
      headers.map(escapeCsv).join(","),
      ...rows.map((row) => row.map(escapeCsv).join(",")),
    ];
    const blob = new Blob(["\ufeff", lines.join("\n")], {
      type: "text/csv;charset=utf-8",
    });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = fileName;
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    setTimeout(() => URL.revokeObjectURL(url), 1000);
  }

  function calcMA(candles, period) {
    return candles.map((_, index) => {
      if (index < period - 1) return null;
      const sum = candles
        .slice(index - period + 1, index + 1)
        .reduce((accumulator, item) => accumulator + item[1], 0);
      return +(sum / period).toFixed(2);
    });
  }

  function formatSigned(value, digits = 2) {
    const number = Number(value || 0);
    return `${number > 0 ? "+" : ""}${number.toFixed(digits)}`;
  }

  function updateSignedCell(cell, value) {
    if (!cell) return;
    cell.textContent = formatSigned(value);
    cell.className = Number(value || 0) >= 0 ? "db-pos" : "db-neg";
  }

  function updatePercentCell(cell, value) {
    if (!cell) return;
    cell.textContent = `${formatSigned(value, 2)}%`;
    cell.className = Number(value || 0) >= 0 ? "db-pos" : "db-neg";
  }

  function updatePriceRow(row, item) {
    if (!row || !item) return;
    const cells = row.querySelectorAll("td");
    if (cells.length < 4) return;
    cells[1].textContent = Number(item.close_price || 0).toFixed(2);
    updateSignedCell(cells[2], item.change);
    updatePercentCell(cells[3], item.change_pct);
  }

  async function loadSnapshotTables() {
    try {
      const payload = await fetchJson(`${apiBase}/api/price-board/quotes`);
      const items = Array.isArray(payload && payload.items) ? payload.items : [];
      const bySymbol = new Map(
        items.map((item) => [String(item.symbol || "").toLowerCase(), item])
      );

      const crudeRows = document.querySelectorAll("#db-crude-oil tbody tr");
      updatePriceRow(crudeRows[0], bySymbol.get("brent"));
      updatePriceRow(crudeRows[1], bySymbol.get("wti"));
      updatePriceRow(crudeRows[15], bySymbol.get("wti"));
    } catch (error) {
      console.warn("Failed to load local price-board snapshots.", error);
    }
  }

  function buildKlineData(rows) {
    const filteredRows = rows
      .filter((row) => row.trade_date)
      .map((row) => ({
        tradeDate: row.trade_date,
        openPrice: Number(row.open_price),
        closePrice: Number(row.close_price),
        lowPrice: Number(row.low_price),
        highPrice: Number(row.high_price),
        volume: Number(row.volume || 0),
      }))
      .filter((row) =>
        [row.openPrice, row.closePrice, row.lowPrice, row.highPrice].every(Number.isFinite)
      );

    return {
      categories: filteredRows.map((row) => row.tradeDate),
      candles: filteredRows.map((row) => [
        row.openPrice,
        row.closePrice,
        row.lowPrice,
        row.highPrice,
        row.volume,
      ]),
    };
  }

  function getKlineWindow(pointCount) {
    if (pointCount <= 0) {
      return { startValue: 0, endValue: 0, maxValueSpan: maxVisibleKlinePoints };
    }
    const endValue = pointCount - 1;
    const startValue = Math.max(0, pointCount - maxVisibleKlinePoints);
    return {
      startValue,
      endValue,
      maxValueSpan: Math.min(maxVisibleKlinePoints, pointCount),
    };
  }

  function normalizeCustomSeriesRows(rows) {
    return rows
      .filter((row) => row && row.trade_date)
      .map((row) => ({
        date: String(row.trade_date),
        price: Number(row.close_price),
      }))
      .filter((row) => Number.isFinite(row.price))
      .sort((left, right) => left.date.localeCompare(right.date));
  }

  async function ensureCustomMarketSeries(symbol) {
    if (customSeriesCache.has(symbol)) return customSeriesCache.get(symbol);
    if (customSeriesLoads.has(symbol)) return customSeriesLoads.get(symbol);

    const request = fetchJson(
      `${apiBase}/api/market/series?symbol=${encodeURIComponent(symbol)}&limit=5000`
    )
      .then((payload) => {
        const rows = normalizeCustomSeriesRows(Array.isArray(payload && payload.rows) ? payload.rows : []);
        customSeriesCache.set(symbol, rows);
        customSeriesLoads.delete(symbol);
        return rows;
      })
      .catch((error) => {
        customSeriesLoads.delete(symbol);
        throw error;
      });

    customSeriesLoads.set(symbol, request);
    return request;
  }

  function filterSeriesByDateRange(rows, startDate, endDate) {
    return rows.filter((row) => {
      if (startDate && row.date < startDate) return false;
      if (endDate && row.date > endDate) return false;
      return true;
    });
  }

  function buildMockCustomSeries(startDate, endDate, type) {
    const baseMap = {
      brent: 75,
      wti: 72,
      shanghai: 70,
      "wti-crack": 15,
      "ice-diesel": 22,
    };
    const start = new Date(`${startDate}T00:00:00`);
    const end = new Date(`${endDate}T00:00:00`);
    if (Number.isNaN(start.getTime()) || Number.isNaN(end.getTime()) || start > end) {
      return [];
    }
    const base = baseMap[type] || 50;
    const rows = [];
    let index = 0;
    for (const cursor = new Date(start); cursor <= end; cursor.setDate(cursor.getDate() + 1)) {
      const date = cursor.toISOString().slice(0, 10);
      const drift = Math.sin(index / 4) * 1.4 + Math.cos(index / 9) * 0.8;
      const price = +(base + drift + index * 0.03).toFixed(2);
      rows.push({ date, price });
      index += 1;
    }
    return rows;
  }

  async function getCustomSeries(type, startDate, endDate) {
    if (type === "wti") {
      const rows = await ensureCustomMarketSeries("WTI");
      return filterSeriesByDateRange(rows, startDate, endDate);
    }
    if (type === "brent") {
      const rows = await ensureCustomMarketSeries("Brent");
      return filterSeriesByDateRange(rows, startDate, endDate);
    }
    return buildMockCustomSeries(startDate, endDate, type);
  }

  function getSeriesStats(rows) {
    if (!rows.length) {
      return {
        latest: null,
        previous: null,
        change: null,
        changePct: null,
      };
    }
    const latest = rows[rows.length - 1];
    const previous = rows.length > 1 ? rows[rows.length - 2] : rows[rows.length - 1];
    const latestPrice = Number(latest.price);
    const previousPrice = Number(previous.price);
    const change = +(latestPrice - previousPrice).toFixed(2);
    const changePct = previousPrice
      ? +(((latestPrice - previousPrice) / previousPrice) * 100).toFixed(2)
      : 0;
    return {
      latest: latestPrice,
      previous: previousPrice,
      change,
      changePct,
    };
  }

  function formatCustomCell(value) {
    return Number.isFinite(value) ? Number(value).toFixed(2) : "--";
  }

  function formatCustomPercent(value) {
    return Number.isFinite(value) ? `${formatSigned(value)}%` : "--";
  }

  function buildCustomSummaryRow(label, stats) {
    const changeClass = Number(stats.change || 0) >= 0 ? "db-pos" : "db-neg";
    const percentClass = Number(stats.changePct || 0) >= 0 ? "db-pos" : "db-neg";
    if (!Number.isFinite(stats.latest)) {
      return `<tr><td>${label}</td><td>--</td><td>--</td><td>--</td></tr>`;
    }
    return `
      <tr>
        <td>${label}</td>
        <td>${formatCustomCell(stats.latest)}</td>
        <td class="${changeClass}">${formatSigned(stats.change)}</td>
        <td class="${percentClass}">${formatCustomPercent(stats.changePct)}</td>
      </tr>
    `;
  }

  function buildCustomDateAxis(firstRows, secondRows) {
    return Array.from(
      new Set([
        ...firstRows.map((row) => row.date),
        ...secondRows.map((row) => row.date),
      ])
    ).sort((left, right) => left.localeCompare(right));
  }

  function buildCustomSeriesValues(dates, rows) {
    const valueMap = new Map(rows.map((row) => [row.date, row.price]));
    return dates.map((date) => {
      const value = valueMap.get(date);
      return Number.isFinite(value) ? value : null;
    });
  }

  function mergeCustomDateBounds(...boundsList) {
    const normalized = boundsList.filter(
      (bounds) => bounds && bounds.min && bounds.max && bounds.min <= bounds.max
    );
    if (!normalized.length) return null;
    return normalized.reduce(
      (accumulator, bounds) => ({
        min: accumulator.min < bounds.min ? accumulator.min : bounds.min,
        max: accumulator.max > bounds.max ? accumulator.max : bounds.max,
      }),
      normalized[0]
    );
  }

  function getRowsDateBounds(rows) {
    if (!Array.isArray(rows) || !rows.length) return null;
    return {
      min: rows[0].date,
      max: rows[rows.length - 1].date,
    };
  }

  function getCurrentCustomDateInputs() {
    return {
      startInput: document.getElementById("db-start-date"),
      endInput: document.getElementById("db-end-date"),
    };
  }

  function getFallbackCustomDateBounds() {
    const { startInput, endInput } = getCurrentCustomDateInputs();
    const startValue = startInput && startInput.value ? startInput.value : "2015-01-05";
    const endValue = endInput && endInput.value ? endInput.value : "2025-12-17";
    return {
      min: startValue < endValue ? startValue : endValue,
      max: endValue > startValue ? endValue : startValue,
    };
  }

  function applyCustomDateBounds(bounds, changedField) {
    const { startInput, endInput } = getCurrentCustomDateInputs();
    if (!startInput || !endInput) return;

    const safeBounds = bounds || getFallbackCustomDateBounds();
    startInput.min = safeBounds.min;
    startInput.max = safeBounds.max;
    endInput.min = safeBounds.min;
    endInput.max = safeBounds.max;

    if (!startInput.value || startInput.value < safeBounds.min || startInput.value > safeBounds.max) {
      startInput.value = safeBounds.min;
    }
    if (!endInput.value || endInput.value < safeBounds.min || endInput.value > safeBounds.max) {
      endInput.value = safeBounds.max;
    }

    if (startInput.value > endInput.value) {
      if (changedField === "start") {
        endInput.value = startInput.value;
      } else if (changedField === "end") {
        startInput.value = endInput.value;
      } else {
        startInput.value = safeBounds.min;
        endInput.value = safeBounds.max;
      }
    }
  }

  function shouldRefreshCustomCompare() {
    return Array.isArray(lastCustomExport.rows) && lastCustomExport.rows.length > 0;
  }

  function bindCustomDateInputs() {
    if (customDateInputsBound) return;
    const { startInput, endInput } = getCurrentCustomDateInputs();
    if (!startInput || !endInput) return;

    const handleDateChange = (field) => {
      applyCustomDateBounds(customDateBounds, field);
      if (shouldRefreshCustomCompare()) {
        void window.dbRenderCustom();
      }
    };

    startInput.addEventListener("change", () => handleDateChange("start"));
    endInput.addEventListener("change", () => handleDateChange("end"));
    customDateInputsBound = true;
  }

  async function initializeCustomDateInputs() {
    bindCustomDateInputs();
    if (!customDateBounds) {
      try {
        const [wtiRows, brentRows] = await Promise.all([
          ensureCustomMarketSeries("WTI"),
          ensureCustomMarketSeries("Brent"),
        ]);
        customDateBounds = mergeCustomDateBounds(
          getRowsDateBounds(wtiRows),
          getRowsDateBounds(brentRows)
        );
      } catch (error) {
        console.warn("Failed to initialize custom date bounds from local market data.", error);
        customDateBounds = getFallbackCustomDateBounds();
      }
    }
    applyCustomDateBounds(customDateBounds);
  }

  function setCustomExportButtonLabel() {
    const exportButton = document.querySelector("#db-custom-modal .db-chart-wrap .db-modal-btn");
    if (exportButton) exportButton.textContent = "导出数据";
  }

  function getCustomYAxisRange(...seriesGroups) {
    const values = seriesGroups
      .flat()
      .filter((value) => Number.isFinite(value))
      .map((value) => Number(value));

    if (!values.length) return null;

    const minValue = Math.min(...values);
    const maxValue = Math.max(...values);
    const spread = maxValue - minValue;
    const padding = spread > 0
      ? spread * 0.12
      : Math.max(Math.abs(maxValue) * 0.05, 0.5);

    return {
      min: +(minValue - padding).toFixed(2),
      max: +(maxValue + padding).toFixed(2),
    };
  }

  function renderCustomCompareChart(chartEl, titleOne, titleTwo, dates, seriesOneValues, seriesTwoValues) {
    if (typeof echarts === "undefined" || !chartEl) return;
    if (!customCompareChart) {
      customCompareChart = echarts.init(chartEl);
    }
    const yAxisRange = getCustomYAxisRange(seriesOneValues, seriesTwoValues);

    customCompareChart.setOption({
      animation: false,
      backgroundColor: "transparent",
      tooltip: {
        trigger: "axis",
        backgroundColor: "rgba(18,18,20,.95)",
        borderColor: "rgba(214,179,106,.30)",
        textStyle: { color: "#f6e3b2" },
        formatter(points) {
          const rows = Array.isArray(points) ? points : [];
          const date = rows[0] ? rows[0].axisValue : "";
          const lines = [`日期：${date}`];
          const firstPoint = rows[0];
          const secondPoint = rows[1];
          rows.forEach((point) => {
            if (Number.isFinite(point.data)) {
              lines.push(`${point.seriesName}：${Number(point.data).toFixed(2)}`);
            }
          });
          if (
            firstPoint &&
            secondPoint &&
            Number.isFinite(firstPoint.data) &&
            Number.isFinite(secondPoint.data)
          ) {
            lines.push(`价差：${(Number(firstPoint.data) - Number(secondPoint.data)).toFixed(2)}`);
          }
          return lines.join("<br>");
        },
      },
      legend: {
        data: [titleOne, titleTwo],
        textStyle: { color: "#f6e3b2" },
        bottom: 0,
      },
      grid: {
        left: "3%",
        right: "4%",
        bottom: "15%",
        top: "10%",
        containLabel: true,
      },
      xAxis: {
        type: "category",
        boundaryGap: false,
        data: dates,
        axisLabel: {
          color: "rgba(240,240,242,.50)",
          fontSize: 10,
          formatter(value) {
            const parts = String(value).split("-");
            return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value;
          },
        },
        splitLine: { show: false },
      },
      yAxis: {
        scale: true,
        min: yAxisRange ? yAxisRange.min : null,
        max: yAxisRange ? yAxisRange.max : null,
        axisLabel: { color: "rgba(240,240,242,.50)", fontSize: 10 },
        splitLine: { lineStyle: { color: "rgba(214,179,106,.08)" } },
      },
      series: [
        {
          id: "custom-series-1",
          name: titleOne,
          type: "line",
          data: seriesOneValues,
          smooth: true,
          connectNulls: true,
          symbol: "none",
          lineStyle: { color: "#d6b36a", width: 2 },
          areaStyle: { color: "rgba(214,179,106,.08)" },
        },
        {
          id: "custom-series-2",
          name: titleTwo,
          type: "line",
          data: seriesTwoValues,
          smooth: true,
          connectNulls: true,
          symbol: "none",
          lineStyle: { color: "#f6e3b2", width: 2 },
          areaStyle: { color: "rgba(246,227,178,.06)" },
        },
      ],
    }, { notMerge: true });
  }

  async function renderRealKline(product) {
    const symbol = product === "brent" ? "Brent" : product === "wti" ? "WTI" : null;
    if (!symbol || typeof echarts === "undefined") return;

    const wrap = document.getElementById("dbKLineChart");
    if (!wrap) return;

    const chart = echarts.getInstanceByDom(wrap);
    if (!chart) return;

    const requestToken = ++klineRequestToken;

    try {
      const payload = await fetchJson(
        `${apiBase}/api/price-board/kline?symbol=${encodeURIComponent(symbol)}&limit=5000`
      );
      if (requestToken !== klineRequestToken) return;

      const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
      const klineData = buildKlineData(rows);
      if (!klineData.candles.length) return;
      const zoomWindow = getKlineWindow(klineData.candles.length);

      const ma5 = calcMA(klineData.candles, 5);
      const ma20 = calcMA(klineData.candles, 20);

      chart.setOption({
        animation: false,
        backgroundColor: "transparent",
        tooltip: {
          trigger: "axis",
          axisPointer: { type: "cross" },
          borderColor: "#d6b36a",
          backgroundColor: "rgba(18,18,20,.95)",
          textStyle: { color: "#f6e3b2" },
          formatter(points) {
            const candlePoint = points.find((point) => point.seriesType === "candlestick");
            const item = candlePoint && candlePoint.data;
            const date = (candlePoint && candlePoint.axisValueLabel) || "";
            if (!item) return "";
            const formatNumber = (value) => Number(value).toFixed(2);
            const formatVolume = (value) => Number(value || 0).toLocaleString("zh-CN");
            return [
              `日期：${date}`,
              `开盘：${formatNumber(item[0])}　收盘：${formatNumber(item[1])}`,
              `最低：${formatNumber(item[2])}　最高：${formatNumber(item[3])}`,
              `成交量：${formatVolume(item[4])}`,
            ].join("<br>");
          },
        },
        legend: {
          data: ["K Line", "MA5", "MA20"],
          textStyle: {
            color: "#f6e3b2",
            fontFamily: '"Noto Sans SC","PingFang SC","Microsoft YaHei UI",sans-serif',
          },
          right: "5%",
          top: "2%",
        },
        grid: { left: "3%", right: "3%", bottom: "5%", top: "15%", containLabel: true },
        xAxis: {
          type: "category",
          data: klineData.categories,
          axisLine: { lineStyle: { color: "rgba(214,179,106,.25)" } },
          splitLine: { show: false },
          axisLabel: {
            color: "rgba(240,240,242,.50)",
            formatter(value) {
              const parts = String(value).split("-");
              return parts.length === 3 ? `${parts[1]}/${parts[2]}` : value;
            },
          },
        },
        yAxis: {
          scale: true,
          axisLine: { lineStyle: { color: "rgba(214,179,106,.25)" } },
          splitLine: { lineStyle: { color: "rgba(214,179,106,.06)", type: "dashed" } },
          axisLabel: { color: "rgba(240,240,242,.50)" },
        },
        dataZoom: [
          {
            type: "inside",
            startValue: zoomWindow.startValue,
            endValue: zoomWindow.endValue,
            maxValueSpan: zoomWindow.maxValueSpan,
          },
        ],
        series: [
          {
            id: "kline-candles",
            name: "K Line",
            type: "candlestick",
            data: klineData.candles,
            itemStyle: {
              color: "#ff5c7c",
              color0: "#39d98a",
              borderColor: "#ff5c7c",
              borderColor0: "#39d98a",
            },
          },
          {
            id: "kline-ma5",
            name: "MA5",
            type: "line",
            data: ma5,
            smooth: true,
            lineStyle: { width: 1, color: "#d6b36a" },
            symbol: "none",
          },
          {
            id: "kline-ma20",
            name: "MA20",
            type: "line",
            data: ma20,
            smooth: true,
            lineStyle: { width: 1, color: "#f6e3b2" },
            symbol: "none",
          },
        ],
      }, { notMerge: true });
    } catch (error) {
      console.warn(`Failed to replace local K-line for ${product}.`, error);
    }
  }

  const previousDbOpenModal = window.dbOpenModal;
  window.dbOpenModal = function () {
    if (typeof previousDbOpenModal === "function") previousDbOpenModal();
    setCustomExportButtonLabel();
    void initializeCustomDateInputs();
  };

  window.dbRenderCustom = async function () {
    await initializeCustomDateInputs();
    const startDate = document.getElementById("db-start-date")?.value || "";
    const endDate = document.getElementById("db-end-date")?.value || "";
    const firstSelect = document.getElementById("db-type1");
    const secondSelect = document.getElementById("db-type2");
    const tableBody = document.getElementById("db-modal-tbody");
    const chartEl = document.getElementById("dbCustomLineChart");

    if (!firstSelect || !secondSelect || !tableBody || !chartEl) return;

    const firstType = firstSelect.value;
    const secondType = secondSelect.value;
    const firstName = firstSelect.options[firstSelect.selectedIndex]?.text || firstType;
    const secondName = secondSelect.options[secondSelect.selectedIndex]?.text || secondType;

    try {
      const [firstRows, secondRows] = await Promise.all([
        getCustomSeries(firstType, startDate, endDate),
        getCustomSeries(secondType, startDate, endDate),
      ]);

      const firstStats = getSeriesStats(firstRows);
      const secondStats = getSeriesStats(secondRows);
      const spreadValue =
        Number.isFinite(firstStats.latest) && Number.isFinite(secondStats.latest)
          ? +(firstStats.latest - secondStats.latest).toFixed(2)
          : null;

      tableBody.innerHTML = [
        buildCustomSummaryRow(firstName, firstStats),
        buildCustomSummaryRow(secondName, secondStats),
        `<tr><td>价差</td><td colspan="3">${formatCustomCell(spreadValue)}</td></tr>`,
      ].join("");

      const dates = buildCustomDateAxis(firstRows, secondRows);
      const firstSeriesValues = buildCustomSeriesValues(dates, firstRows);
      const secondSeriesValues = buildCustomSeriesValues(dates, secondRows);

      renderCustomCompareChart(
        chartEl,
        firstName,
        secondName,
        dates,
        firstSeriesValues,
        secondSeriesValues
      );

      lastCustomExport = {
        headers: ["日期", firstName, secondName, "价差"],
        rows: dates.map((date, index) => {
          const firstValue = firstSeriesValues[index];
          const secondValue = secondSeriesValues[index];
          const spread =
            Number.isFinite(firstValue) && Number.isFinite(secondValue)
              ? +(firstValue - secondValue).toFixed(2)
              : "";
          return [
            date,
            Number.isFinite(firstValue) ? Number(firstValue).toFixed(2) : "",
            Number.isFinite(secondValue) ? Number(secondValue).toFixed(2) : "",
            spread === "" ? "" : Number(spread).toFixed(2),
          ];
        }),
        fileName: `custom_spread_${firstType}_${secondType}_${endDate || "data"}.csv`,
      };
    } catch (error) {
      console.warn("Failed to render custom spread board with local market data.", error);
      tableBody.innerHTML =
        '<tr><td colspan="4" style="text-align:center;color:var(--db-muted)">当前条件下无法加载数据</td></tr>';
    }
  };

  window.dbDownloadChart = function () {
    if (!lastCustomExport.rows.length) {
      alert("请先点击查询，再导出数据。");
      return;
    }
    downloadCsv(lastCustomExport.fileName, lastCustomExport.headers, lastCustomExport.rows);
  };

  const previousInitDatabaseView = window.initDatabaseView;
  window.initDatabaseView = function () {
    if (typeof previousInitDatabaseView === "function") previousInitDatabaseView();
    setTimeout(() => {
      const product = document.getElementById("db-kline-product")?.value || "wti";
      void renderRealKline(product);
      void loadSnapshotTables();
      setCustomExportButtonLabel();
      void initializeCustomDateInputs();
    }, 160);
  };

  const previousDbChangeProduct = window.dbChangeProduct;
  window.dbChangeProduct = function (product) {
    if (product === "wti" || product === "brent") {
      void renderRealKline(product);
      return;
    }
    if (typeof previousDbChangeProduct === "function") previousDbChangeProduct(product);
  };
})();
