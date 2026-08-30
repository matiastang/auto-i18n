# Contracts: 翻译源公开契约（v0.0.4 清理后状态）

**Date**: 2026-08-29 | **Status**: Complete | **Spec**: [spec.md](../spec.md)

本文件描述 v0.0.4 清理后的公开契约。与 v0.0.3（specs/002/contracts/translation-providers.md，历史快照）相比的**破坏性变更**：

| 变更 | v0.0.3 | v0.0.4 | 迁移 |
| --- | --- | --- | --- |
| `TranslateAIModel.ZHIPUAI` | 存在（`'zhipuai'`） | **移除** | 见 C-2 迁移示例 |
| `zhipuaiTranslate` 导出 | 存在 | **移除** | 改用 `openaiTranslate`（智谱参数）或调度器 |
| `DEFAULT_ZHIPUAI_MODEL` 导出 | 存在（`'glm-4'`） | **移除** | 直接写 `'glm-4'` |

不可破坏红线（不变）：`TranslateTarget` 枚举值、`Autoi18nMessages` 缓存键格式（`autoi18n_<md5>`）、`TranslateFunction` 参数与返回语义、三级优先级。

## C-1: 翻译接口契约（自定义翻译的唯一依赖，不变）

```ts
import type { TranslateFunction } from 'auto-i18n-vue'

const myTranslate: TranslateFunction = async (questions, tos, from, cache) => {
    // 返回 { [translateHashKey(原文)]: { [from]: 原文, [to]: 译文 } }；无新增 → null
}

autoi18nPlugin({ ..., translate: myTranslate })   // 最高优先级，独占使用
```

## C-2: LLM 配置（唯一形态：OpenAI Chat Completions 兼容）

```ts
import { autoi18nPlugin, TranslateAIModel } from 'auto-i18n-vue'

autoi18nPlugin({
    ...,
    aiModelConfig: {
        model: TranslateAIModel.OPENAI,          // 唯一 LLM 模式
        config: {
            apiKey: '<your-api-key>',            // 必填
            baseUrl: 'https://api.deepseek.com', // 可选，默认 https://api.openai.com/v1
            model: 'deepseek-chat',              // 必填有效值（调度路径缺失即回退免费源）
        },
    },
})
```

**智谱 GLM 迁移示例**（v0.0.3 `ZHIPUAI` 用户的等价配置，请求体逐字段一致）：

```ts
aiModelConfig: {
    model: TranslateAIModel.OPENAI,
    config: {
        apiKey: '<zhipu-api-key>',
        baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
        model: 'glm-4',                          // 原 ZHIPUAI 模式默认值，改为显式配置
    },
}
```

HTTP 形态（不变）：`POST {baseUrl}/chat/completions`，`Authorization: Bearer <apiKey>`，体 `{ model, messages }`，响应取 `choices[0].message.content`，编号标签 `<n>...</n>` 逐条提取 + 条数校验 + 占位符保留校验。

有效性规则：`apiKey` 为空、`model`（配置项）为空、或 `model`（枚举）非 `OPENAI`（含旧值 `'zhipuai'`）→ 一次性警告并**回退免费翻译源**（不中断构建）。

## C-3: 免费三方翻译（默认行为，零配置，不变）

`translate` 与有效 `aiModelConfig` 均缺失时自动启用：MyMemory（主）→ Google 免费接口（备）逐条回退；失败仅警告跳过，不影响构建。

## C-4: 插件配置总形状（不变）

```ts
interface Autoi18nPluginConfig {
    isDev?: boolean
    locale?: TranslateTarget
    targets?: TranslateTarget[]
    translate?: TranslateFunction            // ① 自定义（最高优先）
    aiModelConfig?: TranslateAIModelConfig   // ② LLM（仅 OPENAI 模式）
    // ③ 以上均无/无效 → 免费三方翻译（默认）
    readTranslateContent: () => Promise<Autoi18nMessages>
    saveTranslateContent: (data: Autoi18nMessages) => Promise<boolean>
}
```

## C-5: 导出清单（`auto-i18n-vue` 入口，v0.0.4 状态）

| 导出 | 类型 | 用途 | 相对 v0.0.3 |
| --- | --- | --- | --- |
| `TranslateAIModel.OPENAI` | enum 成员（唯一） | 选择 OpenAI 兼容 LLM | 不变 |
| `TranslateFunction` / `AIModelConfig` / `TranslateAIModelConfig` / `Autoi18nMessages` / `TranslateTarget` | 类型 | 契约类型依据 | 不变 |
| `openaiTranslate` | provider 函数 | OpenAI 兼容翻译源（智谱经参数接入） | 不变 |
| `freeTranslate` | provider 函数 | 免费翻译源 | 不变 |
| `resolveTranslateFunction` | 调度函数 | 三级优先级解析 | 不变 |
| `toIsoLocale` 等工具/缓存读写 | 工具函数 | 既有能力 | 不变 |
| ~~`zhipuaiTranslate`~~ | — | — | **移除** |
| ~~`DEFAULT_ZHIPUAI_MODEL`~~ | — | — | **移除** |

## C-6: 错误与降级契约

| 场景 | 行为 |
| --- | --- |
| 任一翻译源抛错/网络失败/鉴权失败 | 警告（含错误信息），该批次按失败处理，构建继续 |
| 缓存已有完整译文（from+全部 tos） | 不发起请求（provider 内过滤） |
| LLM 响应条数 ≠ 请求条数 / 编号结构异常 / 占位符丢失 | 丢弃该目标语言整批，警告 |
| 目标语言无 ISO 映射 | 跳过该目标语言，警告 |
| 免费链全部服务失败（单条） | 警告并跳过该条，其余继续 |
| `questions` 为空 | 直接返回 null，零请求 |
| **旧配置值 `'zhipuai'`（v0.0.4 新增行）** | 视为无效配置：一次性警告（含 model 取值与回退去向）+ 回退免费源，构建不中断；TS 用户在编译期即报枚举成员不存在 |
