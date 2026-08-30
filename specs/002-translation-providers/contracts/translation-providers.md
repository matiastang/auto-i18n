# Contracts: 翻译源公开契约（v0.0.3）

**Date**: 2026-08-24 | **Status**: Complete | **Spec**: [spec.md](../spec.md)

本库对外暴露的稳定接口。**破坏性红线**：`TranslateTarget` 枚举值、`Autoi18nMessages` 缓存键格式（`autoi18n_<md5>`）、`TranslateFunction` 参数与返回语义均不可变更（存量缓存与已发布 0.0.1 包兼容性）。

## C-1: 翻译接口契约（用户自定义翻译的唯一依赖）

```ts
import type { TranslateFunction, TranslateTarget, Autoi18nMessages } from 'auto-i18n-vue'

const myTranslate: TranslateFunction = async (questions, tos, from, cache) => {
    // questions: 待翻译文案；tos: 目标语言；from: 源语言；cache: 既有缓存（可用于增量）
    // 返回: { [translateHashKey(原文)]: { [from]: 原文, [to]: 译文 } }；无新增 → null
}
```

接入方式（优先级最高，独占使用）：

```ts
autoi18nPlugin({ ..., translate: myTranslate })
```

约定：实现方可抛异常（插件会捕获并警告，不中断构建），但建议失败时返回 `null`；返回 `null` 时插件不更新缓存。

## C-2: LLM 配置（apikey + 常见接口）

```ts
import { autoi18nPlugin, TranslateAIModel } from 'auto-i18n-vue'

autoi18nPlugin({
    ...,
    aiModelConfig: {
        model: TranslateAIModel.OPENAI,            // OpenAI 兼容（OpenAI/DeepSeek/Kimi/通义/Ollama…）
        config: {
            apiKey: '<your-api-key>',
            baseUrl: 'https://api.deepseek.com',    // 可选，默认 https://api.openai.com/v1
            model: 'deepseek-chat',                 // OPENAI 模式必填
        },
    },
})
// 或既有智谱直连（行为与 0.0.1 一致，model 默认 glm-4）：
autoi18nPlugin({ ..., aiModelConfig: { model: TranslateAIModel.ZHIPUAI, config: { apiKey: '<key>' } } })
```

HTTP 形态（OpenAI 兼容）：`POST {baseUrl}/chat/completions`，`Authorization: Bearer <apiKey>`，体 `{ model, messages, temperature }`，响应取 `choices[0].message.content`，以 `<...>` 标签逐条提取并做条数校验。

有效性规则：`apiKey` 为空，或 OPENAI 模式 `model` 为空，或 `model` 为未知枚举值 → 警告并**回退免费翻译源**（不中断）。

## C-3: 免费三方翻译（默认行为，零配置）

`translate` 与 `aiModelConfig` 均未配置（或配置无效）时自动启用：

- 服务链：MyMemory（主，`api.mymemory.translated.net`）→ Google 免费接口（备，`translate.googleapis.com/translate_a/single?client=gtx`），逐条回退
- 无需任何 Key；控制台打印一次性提示与单条失败警告
- 每条文本 × 每个目标语言一次请求；失败仅跳过该条，不影响其余文案与构建

## C-4: 插件配置总形状（Autoi18nPluginConfig）

```ts
interface Autoi18nPluginConfig {
    isDev?: boolean
    locale?: TranslateTarget            // 默认 zh
    targets?: TranslateTarget[]         // 默认 [zh, en]
    translate?: TranslateFunction       // ① 自定义（最高优先）
    aiModelConfig?: TranslateAIModelConfig  // ② LLM
    // ③ 以上均无 → 免费三方翻译（默认）
    readTranslateContent: () => Promise<Autoi18nMessages>          // 必填
    saveTranslateContent: (data: Autoi18nMessages) => Promise<boolean>  // 必填
}
```

## C-5: 新增导出清单（`auto-i18n-vue` 入口）

| 导出 | 类型 | 用途 |
| --- | --- | --- |
| `TranslateAIModel.OPENAI` | enum 成员 | 选择 OpenAI 兼容 LLM |
| `TranslateFunction` / `AIModelConfig` / `TranslateAIModelConfig` / `Autoi18nMessages` / `TranslateTarget` | 类型 | 自定义翻译实现与配置的类型依据（FR-005） |
| `openaiTranslate` | provider 函数 | OpenAI 兼容翻译源（可独立调用） |
| `freeTranslate` | provider 函数 | 免费翻译源（可独立调用） |
| `zhipuaiTranslate` | provider 函数（既有） | 智谱 GLM 翻译源 |
| `resolveTranslateFunction` | 调度函数 | 按三级优先级解析出 TranslateFunction |
| `toIsoLocale` | 工具函数 | 内部语言枚举 → ISO 语言代码（zh→zh-CN, jp→ja, ara→ar, fra→fr；未知 → null） |

## C-6: 错误与降级契约（FR-007/FR-008/FR-010）

| 场景 | 行为 |
| --- | --- |
| 任一翻译源抛错/网络失败/鉴权失败 | 警告（含错误信息），该批次按失败处理，构建继续 |
| 缓存已有完整译文（from+全部 tos） | 不发起请求（provider 内过滤） |
| LLM 响应条数 ≠ 请求条数 | 丢弃该目标语言整批，警告 |
| 目标语言无 ISO 映射 | 跳过该目标语言，警告 |
| 免费链全部服务失败（单条） | 警告并跳过该条，其余继续 |
| `questions` 为空 | 直接返回 null，零请求 |
