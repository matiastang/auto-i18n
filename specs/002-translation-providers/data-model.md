# Data Model: 核心翻译能力——多翻译源接入（v0.0.3）

**Date**: 2026-08-24 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

本特性无数据库；数据实体为 TypeScript 类型与 JSON 缓存文件。既有实体（`Autoi18nMessages` 缓存、`TranslateTarget` 枚举）**字段与取值不变**，仅新增/扩展以下实体。

## 实体总览

```text
TranslateTarget（既有，不变）      语言枚举：zh / en / jp / ara / fra
TranslateAIModel（扩展）           LLM 服务枚举：zhipuai（既有）+ openai（新增，OpenAI 兼容）
AIModelConfig（扩展）              { apiKey, baseUrl?, model? }
TranslateFunction（固化契约）      (questions, tos, from, cache?) => Promise<Autoi18nMessages | null>
Autoi18nPluginConfig（不变形状）   translate / aiModelConfig 均可选 ⇒ 免费默认路径成立
TranslateResult / TransResultItem  LLM 批量翻译中间结构（既有，提升到 shared 共享）
```

## 实体定义

### TranslateAIModel（扩展）

| 字段 | 值 | 说明 |
| --- | --- | --- |
| `ZHIPUAI` | `'zhipuai'` | 既有：智谱 GLM 直连（baseUrl/model 预置 glm-4） |
| `OPENAI` | `'openai'`（新增） | 任何 OpenAI Chat Completions 兼容服务（OpenAI/DeepSeek/Kimi/通义兼容模式/Ollama…） |

校验规则：`resolveTranslateFunction` 只认这两个值；未知值 → 警告并回退免费源。

### AIModelConfig（扩展）

| 字段 | 类型 | 必填 | 默认 | 校验 |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | 是 | — | 空字符串视为"配置不完整"→ 回退免费源并警告 |
| `baseUrl` | `string` | 否 | OPENAI：`https://api.openai.com/v1`；ZHIPUAI：`https://open.bigmodel.cn/api/paas/v4` | 尾部 `/` 容错拼接 `/chat/completions` |
| `model` | `string`（**新增**） | OPENAI 必填有效值 | ZHIPUAI 缺省 `'glm-4'` | OPENAI 下为空 → 回退免费源并警告；请求体原样携带 |

### TranslateFunction（翻译接口契约——三种翻译源的统一格式）

```ts
type TranslateFunction = (
    questions: string[],                  // 待翻译文案（源语言）
    tos: TranslateTarget[],               // 目标语言列表
    from: TranslateTarget,                // 源语言
    cache?: Autoi18nMessages,             // 既有翻译缓存（用于去重）
) => Promise<Autoi18nMessages | null>     // 新增译文（含源语言回填）；无新增/失败 → null
```

返回值约束（所有 provider 一致）：
- 键 = `translateHashKey(原文)`（`autoi18n_<md5>`，与缓存键同构）
- 值 = `{ [from]: 原文, [to]: 译文, ... }`（源语言原样回填，多目标合并于同一键）
- 实现方（内置或用户自定义）抛异常时由插件捕获并警告（FR-007），实现方自身也应尽量返回 null 而非抛错

### TranslateResult / TransResultItem（LLM 批量中间结构，迁至 shared 共享）

```ts
interface TransResultItem { src: string; dst: string }
interface TranslateResult { from: TranslateTarget; to: TranslateTarget; trans_result: TransResultItem[] }
```

由 `translateMessage(data, cache?)` 折叠为 `Autoi18nMessages`；LLM 响应提取条数 ≠ 请求条数 → 整批丢弃（该目标语言）。

### 翻译缓存 Autoi18nMessages（既有，不变）

```json
{ "autoi18n_d303267ad01bf37952fac338fcd1a025": { "zh": "问题：", "en": "Question:", "jp": "問題：" } }
```

状态转换：`readTranslateContent`（buildStart 读入）→ provider 内 `checkTranslateQuestions` 过滤已完整缓存项（FR-008）→ 新译文 `translateMessage` 折叠 → lodash `merge` 增量合并 → `saveTranslateContent`（buildEnd 仅在有新增时落盘）。

### 免费翻译源内部结构（free.ts，不对外）

| 结构 | 说明 |
| --- | --- |
| 免费服务链 | 固定顺序 `[MyMemory, GoogleGtx]`；逐条文本 × 目标语言调用，失败（网络/非 200/配额/解析异常）→ 换下一服务重试该条，全链失败 → 警告并跳过该条 |
| MyMemory 响应契约 | `responseStatus===200` 且 `responseData.translatedText` 为 string 才接受；`quotaFinished===true` 或非 200 视为失败 |
| Google gtx 响应契约 | `data[0][0][0]` 为非空 string 才接受 |
| 语言映射 | `toIsoLocale`：zh→zh-CN、en→en、jp→ja、ara→ar、fra→fr；null → 跳过该目标并警告（FR-009） |

## 状态与生命周期

```text
构建期（Node）:
  config → resolveTranslateFunction ──► translate fn ──► Autoi18nMessages ──► merge → translate.json
                │                                                        ▲
                └── 优先级: config.translate > aiModelConfig(有效) > free  └── cache 命中过滤(FR-008)

运行期（浏览器，v0.0.1 既有，本版本不动）:
  translate.json --XHR--> autoi18nInfo.messages --> $translate/autoTranslate（{name} 插值）
```
