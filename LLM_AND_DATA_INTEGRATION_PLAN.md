# LLM 与真实数据接入方案

## 1. 目标定义

这份文档只聚焦下一阶段的真实目标，不讨论历史 UI 微调。

当前明确目标如下：

- 套保助手接入大语言模型
- 接入所有 `WTI`、`Brent` 相关真实数据
- 真实数据覆盖：
  - 预测中心
  - 价格看板
  - 数据库页
- 后续按时间继续接入其他真实数据
- 预测中心需要接入团队已有的 `Python` 预测模型
- 新闻与研究模块暂时不是这一阶段的重点

也就是说，下一阶段的核心不是继续堆前端演示逻辑，而是完成：

- 前端展示层
- 后端接口层
- MySQL 数据层
- Python 预测服务
- 大语言模型服务

这五层之间的稳定联通。

---

## 2. 总体架构建议

建议后续系统采用下面的结构。

```text
前端 index.html / 0316.html / 各业务模块
        |
        v
统一业务后端 API
        |
        +-- MySQL（行情、预测结果、元数据、对话记录）
        |
        +-- Python 预测服务（模型推理）
        |
        +-- 大语言模型服务（套保助手 / 解释生成）
```

推荐职责划分：

- 前端：只负责展示、交互、图表渲染、参数收集
- API 层：统一查库、鉴权、数据聚合、模型调用、LLM 调用
- MySQL：保存时间序列、预测结果、标签、会话、缓存
- Python 服务：负责预测模型推理
- LLM 服务：负责自然语言解释、对话、策略建议生成

关键原则：

- 不让前端直接拼预测结果
- 不让前端直接承担业务判断
- 不让前端持有“临时规则即业务真相”

---

## 3. 当前前端应承担的角色

当前这个仓库保留为：

- 可视化前端
- 多模块交互壳
- 套保助手 UI
- 数据展示容器

后续应逐步移除前端中的：

- 静态行情数组
- 前端伪随机生成数据
- 前端伪预测逻辑
- 前端伪研报/伪快讯数据

对当前仓库来说，下一阶段最重要的变化是：

> 前端从“生成数据”转为“消费 API”

---

## 4. 模块级接入目标

## 4.1 套保助手

目标：

- 接入真实大语言模型
- 保留现有聊天 UI
- 保留左侧业务参数输入
- 将参数、历史消息、市场数据一起提供给模型

建议后端接口：

- `POST /api/hedge/chat`

建议请求体：

```json
{
  "session_id": "hedge_xxx",
  "message": "我需要在2026-04-30采购20万桶原油，请帮我设计套保思路",
  "context": {
    "business_type": "采购",
    "risk_profile": "稳健型",
    "spot_volume": 200000,
    "expiry_date": "2026-04-30",
    "spot_symbol": "Brent"
  },
  "history": [
    {
      "role": "user",
      "content": "先看保证金占用"
    }
  ]
}
```

建议响应体：

```json
{
  "session_id": "hedge_xxx",
  "reply": "基于你的采购方向、到期时间和风险偏好，建议优先考虑分批建立多头套保...",
  "cards": [
    {
      "type": "strategy_summary",
      "title": "建议策略",
      "items": [
        "优先考虑Brent近月合约",
        "分两批建仓",
        "控制保证金占用"
      ]
    }
  ],
  "used_market_data": {
    "spot_price": 74.2,
    "forward_curve": "backwardation"
  }
}
```

前端需要改的点：

- 把当前本地发送消息逻辑改为异步请求
- 发送时将左侧表单参数一并传出
- 收到回复后渲染 AI 气泡
- 支持 loading、失败态、重试

后端需要做的点：

- 从 MySQL 读取当前市场数据
- 整理 prompt
- 调用大语言模型
- 保存对话记录

建议 MySQL 表：

- `hedge_chat_session`
- `hedge_chat_message`
- `hedge_strategy_snapshot`

---

## 4.2 预测中心

这是第二核心模块。

目标：

- 所有 `WTI` / `Brent` 相关展示改为真实数据
- 接入团队已有 Python 预测模型
- 前端不再伪造预测结果

预测中心建议拆成 4 类数据：

### A. 基础行情输入

例如：

- WTI 现货
- Brent 现货
- WTI 连续
- Brent 连续
- 期限结构
- 库存/OPEC/美元/运价等因子输入

### B. 模型输出

例如：

- 预测曲线
- 置信区间
- 回测结果
- 因子权重
- 模型版本
- 推理时间

### C. 外部一致预期

例如：

- Brent 市场一致预期
- 机构预期价格
- 发布时间

### D. 历史事件数据

例如：

- 时间轴事件
- 维度标签
- 对价格的影响方向

### 4.2.1 推荐接口

建议接口拆分如下：

- `GET /api/forecast/market-inputs?symbol=WTI`
- `GET /api/forecast/curve?symbol=Brent&horizon=30&model=ap`
- `GET /api/forecast/backtest?symbol=WTI&model=ap`
- `GET /api/forecast/factors?symbol=Brent&model=ap`
- `GET /api/forecast/consensus?symbol=Brent`
- `GET /api/forecast/events?symbol=Brent`

如果预测需要实时触发，也可以加：

- `POST /api/forecast/run`

### 4.2.2 Python 模型接入方式

建议不要让前端直接调用 Python。

推荐方式：

```text
前端 -> 主 API 服务 -> Python 预测服务 -> 返回结果 -> MySQL缓存/存档 -> 前端
```

推荐理由：

- 前端不直接暴露模型服务
- 方便统一鉴权和日志
- 方便缓存预测结果
- 方便后续做模型切换和多模型版本管理

### 4.2.3 Python 服务建议输入

```json
{
  "symbol": "Brent",
  "horizon": 30,
  "model": "ap",
  "feature_set": {
    "spot": [...],
    "inventory": [...],
    "dollar_index": [...],
    "shipping": [...],
    "opec": [...]
  }
}
```

### 4.2.4 Python 服务建议输出

```json
{
  "symbol": "Brent",
  "model": "ap",
  "run_at": "2026-03-27T10:30:00+08:00",
  "forecast": [
    {"date": "2026-03-28", "value": 73.8},
    {"date": "2026-03-29", "value": 74.1}
  ],
  "interval_80": [
    {"date": "2026-03-28", "low": 72.9, "high": 74.6}
  ],
  "interval_95": [
    {"date": "2026-03-28", "low": 72.2, "high": 75.4}
  ],
  "factor_importance": {
    "supply": 0.24,
    "inventory": 0.18,
    "macro": 0.15,
    "shipping": 0.09
  },
  "metrics": {
    "mae": 1.82,
    "rmse": 2.41
  }
}
```

### 4.2.5 前端改造原则

预测中心前端应变成：

- 下拉选择器改为发参数
- 图表组件只渲染接口结果
- 因子分析只读后端返回的因子重要度
- 回测图只读后端返回的回测数据
- 历史事件时间轴只读数据库/接口数据

---

## 4.3 价格看板

目标：

- 所有 WTI / Brent 实时或准实时数据改为真实接口
- K 线图、均线、相关表格都用统一后端数据

建议接口：

- `GET /api/price-board/quotes`
- `GET /api/price-board/kline?symbol=WTI&period=daily`
- `GET /api/price-board/related-news?symbol=Brent`
- `GET /api/price-board/supply-demand-summary`

建议返回内容：

- 最新价
- 涨跌额
- 涨跌幅
- OHLCV
- 各均线数值
- 数据时间戳

建议 MySQL 表：

- `market_quote_realtime`
- `market_kline_daily`
- `market_kline_hourly`
- `market_indicator_series`

前端应做的事：

- 彻底停止使用内置行情数组
- K 线图只依赖后端返回的 OHLCV
- 均线由后端返回，或由后端统一计算

建议：

- 均线最好由后端统一算
- 前端不要再重复算 MA5/MA10/MA20/MA60/MA120/MA250

---

## 4.4 数据库页 `0316.html`

目标：

- 让指标目录和右侧已选数据都来自真实数据系统
- 成为“前台数据查询器”

建议接口：

- `GET /api/data/catalog`
- `POST /api/data/query`
- `POST /api/data/export`

`catalog` 用于返回：

- 指标名称
- 分类
- 单位
- 频率
- 数据源
- 是否支持图表

`query` 用于返回：

- 指标时间序列
- 表格数据
- 可视化信息

推荐请求体：

```json
{
  "items": [
    {"code": "wti_spot", "freq": "daily"},
    {"code": "brent_spot", "freq": "daily"}
  ],
  "date_from": "2025-01-01",
  "date_to": "2026-03-27",
  "view": "chart"
}
```

### 4.4.1 为什么这块适合后接

数据库页的交互比首页和套保助手复杂得多：

- 左侧目录
- 右侧多面板
- 图表与表格切换
- 多数据项组合

因此更适合等市场数据 API 稳定后再接。

---

## 4.5 主页与其他展示区

用户已明确：

- 除新闻/研究外，其他展示数据都要逐步接入真实数据

这意味着主页后续也应接：

- 市场快照
- 风险预警数值
- 价格走势
- 与 WTI/Brent 相关的摘要卡片

建议接口：

- `GET /api/home/snapshot`
- `GET /api/home/price-trend`
- `GET /api/home/risk-summary`

---

## 5. 数据范围建议

用户当前明确要做的是：

- `WTI`
- `Brent`

因此第一阶段数据库设计和接口设计，应围绕这两个核心标的展开。

建议优先接入的数据类别：

### 5.1 核心价格数据

- WTI 现货
- Brent 现货
- WTI 连续
- Brent 连续
- OHLCV
- 不同周期 K 线

### 5.2 预测所需特征数据

- 美国原油库存
- 成品油库存
- OPEC 产量
- 美元指数
- 运价指数
- 裂解价差
- 相关宏观变量

### 5.3 结构性辅助数据

- Brent-WTI 价差
- 月差/contango/backwardation
- 关键事件标签
- 一致预期数据

### 5.4 后续可扩展数据

用户提到后续会继续按时间接入其他真实数据，因此架构上要允许未来新增：

- 中国原油数据
- 航运数据
- 需求侧数据
- 炼厂/裂解/加工数据
- 更多宏观与地缘变量

所以数据库和接口必须支持：

- 指标可扩展
- 维度可扩展
- 频率可扩展

---

## 6. MySQL 层建议

如果要支撑前述模块，MySQL 至少应分成以下几类表。

## 6.1 行情类

- `market_symbol`
- `market_quote_realtime`
- `market_kline_daily`
- `market_kline_intraday`

## 6.2 因子类

- `factor_series`
- `factor_definition`

## 6.3 预测类

- `forecast_run`
- `forecast_curve_point`
- `forecast_interval_point`
- `forecast_factor_importance`
- `forecast_metric`
- `forecast_consensus`
- `forecast_event`

## 6.4 套保助手类

- `hedge_chat_session`
- `hedge_chat_message`
- `hedge_context_snapshot`
- `hedge_strategy_output`

## 6.5 数据目录类

- `data_catalog`
- `data_source`
- `data_series_meta`

关键建议：

- 所有时间序列都尽量标准化
- 标的和指标都用 `code` 管理，而不是中文名硬编码

例如：

- `WTI_SPOT`
- `BRENT_SPOT`
- `WTI_CONT`
- `BRENT_CONT`
- `US_CRUDE_INVENTORY`

---

## 7. API 设计建议

建议所有前端都不要直连多个服务，而是统一走一个业务 API。

例如：

### 7.1 市场数据

- `GET /api/market/snapshot`
- `GET /api/market/kline`
- `GET /api/market/series`

### 7.2 预测中心

- `GET /api/forecast/curve`
- `GET /api/forecast/factors`
- `GET /api/forecast/backtest`
- `GET /api/forecast/consensus`
- `GET /api/forecast/events`
- `POST /api/forecast/run`

### 7.3 套保助手

- `POST /api/hedge/chat`
- `GET /api/hedge/session/:id`
- `POST /api/hedge/strategy`

### 7.4 数据库页

- `GET /api/data/catalog`
- `POST /api/data/query`
- `POST /api/data/export`

---

## 8. 前端改造优先级

建议按这个顺序改。

## 第一阶段：套保助手

原因：

- 前端 UI 已经成熟
- 接口边界清晰
- 最能体现 LLM 价值

需要改的前端文件：

- `index.html`
- 可能新增 `js/hedge-service.js`

建议不要继续把全部逻辑塞在 `index.html` 里，后续最好新增独立模块文件。

## 第二阶段：预测中心

原因：

- 预测中心最需要接 Python 模型
- 当前前端伪逻辑最多
- 一旦接通，产品价值会显著提升

建议新增：

- `js/forecast-api.js`
- `js/forecast-renderer.js`

## 第三阶段：主页与价格看板

原因：

- 真正体现真实市场数据能力
- 适合复用统一行情接口

## 第四阶段：数据库页

原因：

- 交互复杂
- 依赖目录、频率、导出等更多后端规则

---

## 9. 推荐的最小可用版本

如果希望尽快出一个可演示版本，建议优先完成以下 MVP。

### 9.1 套保助手 MVP

- 左侧表单参数可提交
- 聊天消息发送到后端
- 后端调用 LLM 返回文本
- 前端渲染 AI 回复

### 9.2 预测中心 MVP

- Brent / WTI 可切换
- 调接口拿预测曲线
- 调接口拿置信区间
- 调接口拿因子重要度
- 调接口拿一致预期

### 9.3 价格看板 MVP

- 调接口拿 WTI / Brent 实时价
- 调接口拿 K 线数据
- 渲染图表

做到这三块，系统就已经从“演示前端”升级为“真实业务前台”。

---

## 10. 对后续 AI/工程师的明确执行建议

### 10.1 先确定后端语言和部署方式

必须先明确：

- API 服务是什么语言
- Python 预测模型如何暴露
- LLM 调用在哪一层完成

如果没有统一 API 层，后续会很快失控。

### 10.2 前端不要直连 Python 模型

应该是：

- 前端 -> 业务 API -> Python 模型

而不是：

- 前端 -> Python 模型

### 10.3 前端不要继续保留大量伪数据逻辑

一旦真实数据接口准备好，就应该逐步删除：

- 伪随机生成
- 假时间轴
- 假预测曲线
- 假一致预期表

### 10.4 套保助手要保存上下文

否则它只能做一次性问答，无法成为真正的业务助手。

建议至少保存：

- 用户消息
- AI 回复
- 表单参数快照
- 关联的市场数据快照

### 10.5 预测模型结果要可追踪

建议所有预测结果记录：

- 运行时间
- 模型版本
- 输入窗口
- 预测期
- 标的

否则后续很难做回测、版本对比和错误排查。

---

## 11. 实施顺序建议

建议按下面顺序推进。

### 第 1 步

明确统一后端 API 层和 Python 模型调用方式。

### 第 2 步

接通套保助手：

- 前端聊天
- 后端 LLM
- MySQL 会话保存

### 第 3 步

接通预测中心：

- Python 模型输出
- 预测曲线
- 因子重要度
- 回测指标

### 第 4 步

接通 WTI / Brent 行情接口：

- 首页
- 价格看板
- 数据库页后续复用

### 第 5 步

扩展更多真实数据源，并逐步替换旧演示逻辑。

---

## 12. 最终结论

后续真正的主线应该被定义为：

### 主线一：套保助手智能化

- 接大语言模型
- 接市场数据上下文
- 成为真正的业务对话入口

### 主线二：WTI / Brent 数据产品化

- 预测中心真实化
- 价格看板真实化
- 数据库页真实化
- 后续继续扩展其他真实数据

### 主线三：模型服务化

- Python 预测模型从“本地脚本”变成“可被 API 调用的服务”

只要这三条主线建立起来，这个项目就会从一个展示型前端，真正进入“数据平台 + 智能助手”的状态。

