(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");

  let klineRequestToken = 0;

  async function fetchJson(url) {
    const response = await fetch(url);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return response.json();
  }

  function calcMA(data, period) {
    return data.map((_, index) => {
      if (index < period - 1) return [data[index][0], null];
      const sum = data
        .slice(index - period + 1, index + 1)
        .reduce((accumulator, item) => accumulator + item[2], 0);
      return [data[index][0], +(sum / period).toFixed(2)];
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
    return rows
      .filter((row) => row.trade_date)
      .map((row) => [
        new Date(`${row.trade_date}T00:00:00`).getTime(),
        Number(row.open_price),
        Number(row.close_price),
        Number(row.low_price),
        Number(row.high_price),
        Number(row.volume || 0),
      ])
      .filter((row) => row.slice(1, 5).every(Number.isFinite));
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
        `${apiBase}/api/price-board/kline?symbol=${encodeURIComponent(symbol)}&limit=365`
      );
      if (requestToken !== klineRequestToken) return;

      const rows = Array.isArray(payload && payload.rows) ? payload.rows : [];
      const klineData = buildKlineData(rows);
      if (!klineData.length) return;

      const ma5 = calcMA(klineData, 5);
      const ma20 = calcMA(klineData, 20);

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
            const item = points[0] && points[0].data;
            if (!item) return "";
            const date = new Date(item[0]).toISOString().slice(0, 10);
            return `Date: ${date}<br>Open: ${item[1]} Close: ${item[2]}<br>Low: ${item[3]} High: ${item[4]}<br>Volume: ${item[5]}`;
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
          type: "time",
          scale: true,
          axisLine: { lineStyle: { color: "rgba(214,179,106,.25)" } },
          splitLine: { show: false },
          axisLabel: {
            color: "rgba(240,240,242,.50)",
            formatter(value) {
              const date = new Date(value);
              return `${date.getMonth() + 1}/${date.getDate()}`;
            },
          },
        },
        yAxis: {
          scale: true,
          axisLine: { lineStyle: { color: "rgba(214,179,106,.25)" } },
          splitLine: { lineStyle: { color: "rgba(214,179,106,.06)", type: "dashed" } },
          axisLabel: { color: "rgba(240,240,242,.50)" },
        },
        dataZoom: [{ type: "inside", start: 50, end: 100 }],
        series: [
          {
            name: "K Line",
            type: "candlestick",
            data: klineData,
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
