(function () {
  const apiBase = (window.CC_MARKET_API_CONFIG && window.CC_MARKET_API_CONFIG.base)
    || (/^https?:/i.test(window.location.href)
      ? window.location.origin
      : "http://127.0.0.1:8008");

  const root = document.getElementById("view-module-news");
  const sectionsRoot = document.getElementById("mnSections");
  const queryInput = document.getElementById("mnQ");
  const clearButton = document.getElementById("mnClear");
  const resultCount = document.getElementById("resultCount");

  if (!root || !sectionsRoot) return;

  const sectionConfig = [
    { key: "HIGHLIGHT", name: "今日重点", image: "assets/news.png" },
    { key: "Supply", name: "供给政策（OPEC+）", image: "assets/supply.png" },
    { key: "Geopolitics", name: "风险事件（地缘）", image: "assets/geo.png" },
    { key: "Inventory", name: "数据与流向（库存）", image: "assets/warehouse.png" },
    { key: "Freight", name: "航运与物流（运价）", image: "assets/ship.png" },
    { key: "Spreads", name: "结构与炼化（价差）", image: "assets/oil.png" },
    { key: "Macro", name: "美元与利率（宏观）", image: "assets/macro.png" },
    { key: "Demand", name: "消费与经济（需求）", image: "assets/demand.png" },
  ];

  const highlightAllowedDays = new Set(["2025-12-18", "2025-12-17"]);
  const state = {
    allItems: [],
    query: "",
  };

  function escapeHtml(value) {
    return String(value == null ? "" : value)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function formatPublishedAt(value) {
    const text = String(value || "").trim();
    if (!text) return "--";
    return text.replace("T", " ");
  }

  function formatDateShort(value) {
    const text = formatPublishedAt(value);
    if (text === "--") return text;
    const match = text.match(/^(\d{4})-(\d{2})-(\d{2})\s+(\d{2}):(\d{2})/);
    if (!match) return text;
    return `${match[2]}/${match[3]} ${match[4]}:${match[5]}`;
  }

  function getPublishDay(item) {
    return String(item && item.published_at ? item.published_at : "").slice(0, 10);
  }

  function getImpactValue(item) {
    const value = Number(item && item.impact);
    return Number.isFinite(value) ? value : -1;
  }

  function compareByTimeDesc(left, right) {
    return String(right.published_at || "").localeCompare(String(left.published_at || ""));
  }

  function compareByImpactDesc(left, right) {
    const impactDiff = getImpactValue(right) - getImpactValue(left);
    if (impactDiff !== 0) return impactDiff;
    return compareByTimeDesc(left, right);
  }

  function impactClass(value) {
    const numeric = Number(value);
    if (!Number.isFinite(numeric)) return "impact-low";
    if (numeric >= 80) return "impact-high";
    if (numeric >= 70) return "impact-mid";
    return "impact-low";
  }

  function impactBadge(item) {
    const value = getImpactValue(item);
    if (value < 0) return "";
    return `<span class="${impactClass(value)}">影响 ${value.toFixed(0)}</span>`;
  }

  function buildSubtitle(item) {
    const parts = [
      item.source ? escapeHtml(item.source) : "",
      formatPublishedAt(item.published_at),
    ].filter(Boolean);
    if (getImpactValue(item) >= 0) {
      parts.push(`影响度 ${getImpactValue(item).toFixed(0)}`);
    }
    return parts.join(" · ");
  }

  function getQueryFilteredItems() {
    const keyword = state.query.trim().toLowerCase();
    if (!keyword) return state.allItems.slice();
    return state.allItems.filter((item) => {
      const haystack = [
        item.title,
        item.source,
        item.theme,
        item.section_name,
        item.published_at,
      ].join(" ").toLowerCase();
      return haystack.includes(keyword);
    });
  }

  function getSectionMoreItems(sectionKey, items) {
    if (sectionKey === "HIGHLIGHT") {
      return items
        .filter((item) => highlightAllowedDays.has(getPublishDay(item)))
        .sort(compareByTimeDesc);
    }
    return items
      .filter((item) => item.section_key === sectionKey)
      .sort(compareByTimeDesc);
  }

  function getSectionDisplayItems(sectionKey, items) {
    if (sectionKey === "HIGHLIGHT") {
      return getSectionMoreItems(sectionKey, items)
        .sort(compareByImpactDesc)
        .slice(0, 6);
    }
    return getSectionMoreItems(sectionKey, items).slice(0, 6);
  }

  function buildFeatureCard(section, item) {
    if (!item) {
      return `
        <div class="mn-feature" data-theme="${escapeHtml(section.key)}">
          <div class="f-img" style="background-image:url('${escapeHtml(section.image)}'); background-size:cover; background-position:center;">
            <div class="f-badge"><span class="f-dot"></span>暂无数据</div>
            <div class="f-overlay">
              <div class="f-kicker">${escapeHtml(section.name)}</div>
              <div class="f-title">当前条件下暂无匹配新闻</div>
              <div class="f-meta"><span>请调整搜索条件</span></div>
            </div>
          </div>
        </div>
      `;
    }

    const badgeText = section.key === "HIGHLIGHT" ? "今日重点" : section.name;
    return `
      <div class="mn-feature" data-news-id="${escapeHtml(item.id)}" data-theme="${escapeHtml(section.key)}">
        <div class="f-img" style="background-image:url('${escapeHtml(section.image)}'); background-size:cover; background-position:center;">
          <div class="f-badge">
            <span class="f-dot"></span>${escapeHtml(badgeText)} ${impactBadge(item)}
          </div>
          <div class="f-overlay">
            <div class="f-kicker">${escapeHtml(item.source || section.name)}</div>
            <div class="f-title">${escapeHtml(item.title)}</div>
            <div class="f-meta"><span>${escapeHtml(formatDateShort(item.published_at))}</span><span>点击阅读</span></div>
          </div>
        </div>
      </div>
    `;
  }

  function buildSideItems(items) {
    if (!items.length) {
      return '<div class="hl-item"><p class="hl-title" style="color:var(--mn-empty-text)">当前分类暂无匹配新闻</p></div>';
    }
    return items.map((item) => `
      <div class="hl-item" data-news-id="${escapeHtml(item.id)}">
        <div class="hl-src">${escapeHtml(item.source || "--")}</div>
        <p class="hl-title">${escapeHtml(item.title)}</p>
        <div class="hl-meta"><span>${escapeHtml(formatDateShort(item.published_at))}</span>${impactBadge(item)}</div>
      </div>
    `).join("");
  }

  function buildSection(section, items) {
    const [primary, ...secondary] = items;
    return `
      <div class="mn-section" id="sec-${escapeHtml(section.key)}">
        <div class="mn-section-head">
          <h3>${escapeHtml(section.name)}</h3>
          <div class="mn-section-meta">
            <button class="mn-btn primary" type="button" data-vm data-key="${escapeHtml(section.key)}">更多</button>
          </div>
        </div>
        <div class="mn-body mn-body-hl">
          ${buildFeatureCard(section, primary)}
          <div class="mn-panel">${buildSideItems(secondary)}</div>
        </div>
      </div>
    `;
  }

  function closeModal(wrap) {
    if (wrap && wrap.parentNode) wrap.parentNode.removeChild(wrap);
  }

  function openDetailModal(item, parentWrap) {
    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.dataset.newsReal = "1";
    if (root.classList.contains("mn-light")) wrap.classList.add("mn-light");
    wrap.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="t">${escapeHtml(item.title)}</div>
            <div class="s">${escapeHtml(buildSubtitle(item))}</div>
          </div>
          <button class="modal-close-btn" type="button">关闭</button>
        </div>
        <div class="modal-body">
          <div class="modal-text">分类：${escapeHtml(item.theme || item.section_name || "--")}</div>
          <div class="modal-text">来源：${escapeHtml(item.source || "--")}</div>
          <div class="modal-text">发布时间：${escapeHtml(formatPublishedAt(item.published_at))}</div>
          <div class="modal-text">影响度：${getImpactValue(item) >= 0 ? getImpactValue(item).toFixed(0) : "--"}</div>
        </div>
      </div>
    `;
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) closeModal(wrap);
    });
    wrap.querySelector(".modal-close-btn")?.addEventListener("click", () => closeModal(wrap));
    document.body.appendChild(wrap);
    if (parentWrap) closeModal(parentWrap);
  }

  function openMoreModal(sectionKey) {
    const items = getSectionMoreItems(sectionKey, getQueryFilteredItems());
    const section = sectionConfig.find((entry) => entry.key === sectionKey) || { name: sectionKey };
    const subtitle = sectionKey === "HIGHLIGHT"
      ? `仅保留 2025-12-18 与 2025-12-17，当前共 ${items.length} 条`
      : `按发布时间倒序，当前共 ${items.length} 条`;

    const wrap = document.createElement("div");
    wrap.className = "modal-wrap";
    wrap.dataset.newsReal = "1";
    if (root.classList.contains("mn-light")) wrap.classList.add("mn-light");
    wrap.innerHTML = `
      <div class="modal">
        <div class="modal-head">
          <div>
            <div class="t">${escapeHtml(section.name)} · 更多</div>
            <div class="s">${escapeHtml(subtitle)}</div>
          </div>
          <button class="modal-close-btn" type="button">关闭</button>
        </div>
        <div class="modal-body">
          ${items.length ? `<div class="modal-list">${items.map((item) => `
            <div class="modal-item" data-news-id="${escapeHtml(item.id)}">
              <p class="tt">${escapeHtml(item.title)}</p>
              <div class="mm"><span>${escapeHtml(buildSubtitle(item))}</span></div>
            </div>
          `).join("")}</div>` : '<div class="modal-text">当前分类暂无匹配新闻。</div>'}
        </div>
      </div>
    `;
    wrap.addEventListener("click", (event) => {
      if (event.target === wrap) closeModal(wrap);
    });
    wrap.querySelector(".modal-close-btn")?.addEventListener("click", () => closeModal(wrap));
    wrap.querySelectorAll("[data-news-id]").forEach((element) => {
      element.addEventListener("click", () => {
        const item = items.find((candidate) => String(candidate.id) === String(element.dataset.newsId));
        if (item) openDetailModal(item, wrap);
      });
    });
    document.body.appendChild(wrap);
  }

  function render() {
    const filteredItems = getQueryFilteredItems();
    if (resultCount) resultCount.textContent = `${filteredItems.length} 条`;
    sectionsRoot.innerHTML = sectionConfig
      .map((section) => buildSection(section, getSectionDisplayItems(section.key, filteredItems)))
      .join("");
  }

  async function loadAllItems() {
    const params = new URLSearchParams({ section_key: "HIGHLIGHT", limit: "500" });
    const response = await fetch(`${apiBase}/api/news/list?${params.toString()}`);
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    const payload = await response.json();
    const items = Array.isArray(payload && payload.items) ? payload.items : [];
    state.allItems = items.slice().sort(compareByTimeDesc);
    render();
  }

  if (queryInput) {
    queryInput.addEventListener("input", () => {
      state.query = queryInput.value || "";
      render();
    });
  }

  if (clearButton) {
    clearButton.addEventListener("click", () => {
      state.query = "";
      render();
    });
  }

  sectionsRoot.addEventListener("click", (event) => {
    const moreButton = event.target && event.target.closest ? event.target.closest("[data-vm][data-key]") : null;
    if (moreButton) {
      event.preventDefault();
      event.stopPropagation();
      openMoreModal(String(moreButton.dataset.key || ""));
      return;
    }

    const newsCard = event.target && event.target.closest ? event.target.closest("[data-news-id]") : null;
    if (!newsCard) return;
    const item = state.allItems.find((candidate) => String(candidate.id) === String(newsCard.dataset.newsId));
    if (item) openDetailModal(item);
  });

  setTimeout(() => {
    void loadAllItems().catch((error) => {
      console.warn("Failed to load imported news data.", error);
    });
  }, 0);
})();
