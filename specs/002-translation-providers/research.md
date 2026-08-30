# Research: 核心翻译能力——多翻译源接入（v0.0.3）

**Date**: 2026-08-24 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

## R1: 免费三方翻译服务选型与真实可用性验证

**Decision**: 默认免费翻译源采用 **MyMemory 免费 API 为主、Google 翻译免费网页接口（gtx）为备**的回退链，逐条文本回退、失败仅警告不中断。

**Rationale**: 2026-08-24 在开发机（中国大陆网络）实测：

| 服务 | 接口 | 实测结果 |
| --- | --- | --- |
| Google gtx | `translate.googleapis.com/translate_a/single?client=gtx` | **连接超时（被墙）**，海外可用 |
| 微软 Edge 免费翻译 | `edge.microsoft.com/translate/auth` | **404 已下线** |
| MyMemory | `api.mymemory.translated.net/get?q=..&langpair=zh-CN\|en` | **200 正常**，返回干净 JSON |
| Bing 中国站 | `cn.bing.com` | 200（但网页版翻译需 IG/IID token，抓取成本高） |

MyMemory 实测细节（本次真实免费调用，符合"测试用免费三方"的要求）：
- 请求：`GET https://api.mymemory.translated.net/get?q=你好，世界&langpair=zh-CN|en`
- 响应：`{"responseData":{"translatedText":"Hello world","match":0.99},"responseStatus":200,...}`
- `zh-CN|ja` 正常译出日语；`用户名：{name}，欢迎回来` 译文为 `Welcome back, username: {name}` —— **占位符 `{name}` 原样保留**（FR-006 天然满足）
- 匿名调用有按 IP 的日配额（超限返回 `quotaFinished` / `responseStatus!=200`），需按错误路径处理
- 单次请求只接受一个 `q`（URL 长度也限制约 500 字符），长文本需逐条请求
- 中文语种代码用 `zh-CN`（非 `zh`）

Google gtx（海外可用的备用路径，解析格式为业界公知）：
- `GET https://translate.googleapis.com/translate_a/single?client=gtx&sl=zh-CN&tl=en&dt=t&q=<text>`
- 响应为嵌套数组：`[[[ "译文", "原文", null, null, 10 ]], null, "zh-CN", ...]`，取 `data[0][0][0]`
- 多个 `q` 参数时各段在 `data[0]` 中交叠，按原文不可靠拆分 → **一次请求一条文本**，保证映射正确

**Alternatives considered**:
- 仅 Google gtx（多数开源项目的选择）：中国大陆网络不可达，而本项目作者与主要用户在中文环境，作为唯一默认会导致"零配置开箱即用"在主要用户群失效 → 否决
- 仅 MyMemory：单点依赖，配额与可用性无保障 → 加入 Google 作为回退
- Bing 网页版（`ttranslatev3`）：需要先抓 IG/IID token，脆弱且复杂度高，与"验证阶段跑通流程"的定位不符 → 否决
- LibreTranslate 公共实例：多数已限流/需 Key → 否决
- 微软 Edge 免费接口：实测已 404 下线 → 否决

## R2: "常见 LLM 接口"的标准形态

**Decision**: 以 **OpenAI Chat Completions 兼容格式**为实现标准：`POST {baseUrl}/chat/completions`，`Authorization: Bearer <apiKey>`，请求体 `{model, messages, temperature}`，响应 `choices[0].message.content`。 baseUrl 可配置，默认 `https://api.openai.com/v1`。

**Rationale**: OpenAI 兼容格式已是业界事实标准，DeepSeek（`api.deepseek.com`）、Moonshot/Kimi、通义千问兼容模式（`dashscope.aliyuncs.com/compatible-mode/v1`）、智谱（`open.bigmodel.cn/api/paas/v4`）、本地 Ollama（`localhost:11434/v1`）等均提供等价格点，一个实现覆盖全部。实测本项目既有智谱端点 `open.bigmodel.cn/api/paas/v4/chat/completions` 即为 OpenAI 兼容格式——因此把智谱实现重构为"通用 OpenAI 兼容客户端 + 智谱默认参数（baseUrl/model 固化）"的委托结构，消除重复且 FR-003 行为不变。

**Alternatives considered**:
- 为每家服务商单独写 provider（openai/deepseek/moonshot/...）：重复代码多，枚举膨胀，违背 YAGNI → 否决
- 保留智谱独立实现并另写一套 OpenAI 实现：约 150 行重复（提示词构造、`<...>` 解析、缓存过滤、结果折叠）→ 通过共享模块消重

## R3: LLM 翻译提示词与批量协议（沿用既有智谱协议）

**Decision**: 沿用 v0.0.1 智谱实现的批量协议：文本以 `<...>` 包裹、顿号连接，few-shot 要求保留 `{xx}` 占位符原样，响应用 `extractContentBetweenTags` 提取并做**条数校验**（提取数≠请求数 → 丢弃该目标语言批次）。

**Rationale**: 该协议已在生产验证过（`public/translate.json` 即真实智谱输出）；占位符保留与条数对齐是质量底线。把 `buildTranslatePrompt`/`extractContentBetweenTags`/`checkTranslateQuestions`/`translateMessage` 抽到共享模块供 OpenAI 兼容与智谱两个入口复用。

## R4: 语言代码映射

**Decision**: 新增 `toIsoLocale(target)` 显式映射：`zh→zh-CN`、`en→en`、`jp→ja`、`ara→ar`、`fra→fr`；未知语言返回 null，调用方跳过该目标并警告（FR-009）。MyMemory 与 Google gtx 共用该映射（`langpair` 用 `zh-CN|ja` 形式，`sl/tl` 用同样代码）。

**Rationale**: 内部枚举 `TranslateTarget.JP='jp'`、`ARA='ara'`、`FRA='fra'` 是历史命名（v0.0.1 已发布，值不可改，否则翻译缓存键值与存量翻译全部失配）；三方服务一律要求 ISO 639 代码。LLM 提示词继续用 `translateTargetText` 的中文语种名（"日语"等），与机器翻译的 ISO 代码互不干扰。

**Alternatives considered**: 直接改枚举值为 ISO：破坏存量缓存与已发布 API，属破坏性变更 → 否决。

## R5: 免费翻译如何成为"默认行为"的调度设计

**Decision**: 新增 `resolveTranslateFunction(config)` 统一调度，插件 `transform` 只调它：`config.translate` 存在 → 直接用；否则 `aiModelConfig` 有效（model 匹配且 apiKey 非空，OPENAI 还需 model 非空）→ 对应 LLM provider；否则 → 免费回退链，并打印一次性提示"未配置翻译源，已默认使用免费三方翻译"。同时在 `devTransformModule` 内把 `await translate(...)` 包上 try/catch（FR-007：任何实现抛错都不得中断构建）。

**Rationale**: 现有 transform 里的 if/else 分支已具雏形，收敛为单一解析函数后：三类翻译源可独立测试、优先级集中一处、新增源不再改插件主体。LLM 配置不完整时回退免费而非报错退出，符合"验证阶段能跑通"的容错定位（回退时警告）。

**Alternatives considered**: 配置不完整直接抛错：对验证阶段过于严格，用户少填一个字段就全流程不可用 → 否决。

## R6: 测试策略（全部离线）

**Decision**: 所有自动化测试 stub `global.fetch`，按请求 URL 分发假响应：MyMemory 返回 `responseData.translatedText` 形状、Google 返回嵌套数组形状、OpenAI 返回 `choices[0].message.content` 形状；断言请求的 URL/头/体格式与响应解析、错误路径（非 200、配额、网络 reject、条数不匹配）。不发起任何真实网络请求，不调用任何收费 API（FR-011）。对免费接口的**一次性真实验证**已在本 research（R1）完成并记录，不进入自动化测试与 CI。

**Rationale**: 沿用 v0.0.2 确立的离线测试纪律；CI 无外网凭据且需稳定。stub 形状来自 R1 真实响应，保证解析代码与真实格式一致。

**Alternatives considered**: CI 里真调 MyMemory：引入网络抖动与配额消耗，CI 不稳定 → 否决。

## R7: 演示应用如何验证"其他项目接入"

**Decision**: 演示应用（本仓库根的 demo）在 vite.config.ts 增加 `resolve.alias`：`auto-i18n-vue → src/autoi18n/index.ts`（本地源），并把 `aiModelConfig` 改为"环境变量存在才配置"，无 Key 时零配置走免费默认路径。存量 `public/translate.json` 已缓存演示文案，e2e 不依赖网络。

**Rationale**: demo 此前从 npm 引用已发布的 0.0.1 包，无法验证未发布的新能力；alias 到本地源是最小改动且发布后可一键切回。demo 现存文案已全量缓存，插件命中缓存即跳过翻译请求，e2e 保持离线稳定（v0.0.2 建立的约束）。

**Alternatives considered**: 等发版后用 npm 包验证：无法在本版本开发期内闭环验证 SC-001 → 否决。
