(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");
  const maxVisibleKlinePoints = 300;

  let klineRequestToken = 0;

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
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
            name: "MA5",
            type: "line",
            data: ma5,
            smooth: true,
            lineStyle: { width: 1, color: "#d6b36a" },
            symbol: "none",
          },
          {
            name: "MA20",
            type: "line",
            data: ma20,
            smooth: true,
            lineStyle: { width: 1, color: "#f6e3b2" },
            symbol: "none",
          },
        ],
      });
    } catch (error) {
      console.warn(`Failed to replace local K-line for ${product}.`, error);
    }
  }

  const previousInitDatabaseView = window.initDatabaseView;
  window.initDatabaseView = function () {
    if (typeof previousInitDatabaseView === "function") previousInitDatabaseView();
    setTimeout(() => {
      const product = document.getElementById("db-kline-product")?.value || "wti";
      void renderRealKline(product);
      void loadSnapshotTables();
    }, 160);
  };

  const previousDbChangeProduct = window.dbChangeProduct;
  window.dbChangeProduct = function (product) {
    if (typeof previousDbChangeProduct === "function") previousDbChangeProduct(product);
    void renderRealKline(product);
  };
})();
