# Data Model: 清理智谱特殊化配置（v0.0.4）

**Date**: 2026-08-29 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

本特性无数据库与新增实体，是实体**收缩**：`TranslateAIModel` 枚举减少一个成员，`AIModelConfig` 的语义收敛（智谱从"独立模式"变为"一组参数取值"）。其余实体不变。

## 不变量（破坏性红线，本版本必须保持）

| 实体 | 不变内容 | 依据 |
| --- | --- | --- |
| `TranslateTarget` | 成员与值 `zh/en/jp/ara/fra` 完全不变 | 存量缓存键值兼容（specs/002 R4） |
| `Autoi18nMessages` | 键格式 `autoi18n_<md5>`、值为语言→译文映射 | 缓存与翻译源解耦（FR-005） |
| `TranslateFunction` | 参数与返回语义 `(questions, tos, from, cache?) => Promise<Autoi18nMessages \| null>` | 自定义翻译契约（specs/002 C-1） |
| 优先级 | `translate` > `aiModelConfig`（有效）> 免费源 | FR 体系不变 |

## 实体变更

### TranslateAIModel（收缩）

| 字段 | v0.0.3 | v0.0.4 |
| --- | --- | --- |
| `ZHIPUAI` | `'zhipuai'`（智谱直连，预置 baseUrl/glm-4） | **移除** |
| `OPENAI` | `'openai'` | `'openai'`（唯一成员，OpenAI Chat Completions 兼容） |

校验规则变化：`resolveTranslateFunction` 只认 `OPENAI`；旧值 `'zhipuai'` 与任意未知值同路径——一次性警告 + 回退免费源（构建不中断）。

### AIModelConfig（语义收敛，形状不变）

| 字段 | 类型 | 必填 | 默认 | v0.0.4 语义 |
| --- | --- | --- | --- | --- |
| `apiKey` | `string` | 是 | — | 空字符串 → 无效配置，回退免费源并警告 |
| `baseUrl` | `string` | 否 | `https://api.openai.com/v1` | 任一 OpenAI 兼容服务地址；智谱取值 `https://open.bigmodel.cn/api/paas/v4`；尾部 `/` 容错拼接 `/chat/completions` |
| `model` | `string` | **是**（唯一模式下必填有效值） | `gpt-4o-mini`（仅直调 openaiTranslate 的兜底，调度路径不使用默认值） | 模型名；智谱取值 `glm-4`；调度路径缺失 → 无效配置，回退免费源并警告 |

> v0.0.3 中 `model` 的"ZHIPUAI 模式可缺省（默认 glm-4）"分支随枚举成员一并消失——这正是"智谱不再特殊"的数据面体现：所有 LLM 一律显式配置 `model`。

### 翻译源集合（收缩）

```text
v0.0.3:  custom translate > LLM{ OPENAI | ZHIPUAI } > free(MyMemory→GoogleGtx)
v0.0.4:  custom translate > LLM{ OPENAI（智谱=参数取值） } > free(MyMemory→GoogleGtx)
```

模块层面：`translates/` 由 `{shared, openai, free, provider, zhipuai, index}` 收缩为 `{shared, openai, free, provider, index}`；`shared.ts` 的 Chat Completions 客户端与批量协议**零改动**（实现不变，仅文件头注释去智谱字样）。

## 状态与生命周期（不变，复核通过）

```text
构建期: config → resolveTranslateFunction(唯一 LLM 分支) → chatCompletionsTranslate/free →
        checkTranslateQuestions 缓存过滤 → translateMessage 折叠 → merge → translate.json 落盘
运行期: translate.json --XHR--> $translate/autoTranslate（{name} 插值）——零改动
```

缓存生命周期与本变更正交：删除智谱入口不触碰任何缓存读写路径，存量 `public/translate.json` 与接入方缓存 100% 继续命中（键 = 内容哈希）。
