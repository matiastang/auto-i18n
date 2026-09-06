# Data Model: 零标记自动国际化（v0.2.0）

**Date**: 2026-09-06 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

本特性为词条空间**新增一个来源**（零标记扫描），核心数据契约（`Autoi18nMessages` 词条模型、哈希键、翻译源优先级）完全不变。新增实体集中在构建期扫描与改写侧，均为插件实例内生命周期（不持久化，落盘物仍只有翻译 JSON）。

## 不变量（红线，本版本必须保持）

| 实体 | 不变内容 | 依据 |
| --- | --- | --- |
| `Autoi18nMessages` | 键 `autoi18n_<md5>` → 语言→译文映射；零标记与显式两来源同键合并不重复 | FR-002；缓存与来源解耦 |
| `TranslateTarget` | 成员与值 `zh/en/jp/ara/fra` 不变 | 存量缓存兼容 |
| 翻译源优先级 | `translate` > `aiModelConfig`（有效）> 免费源 | FR-002 沿用 |
| 显式 API 行为 | `$translate`/`autoTranslate` 的 dev/prod 全链路行为与 v0.1.0 逐字节一致 | FR-008 |
| 运行时公开导出面 | 既有导出（`autoi18n`/`autoTranslate`/`autoi18nInfo`/`autoi18nPlugin`/…）全部保留 | 接入方编译期依赖 |

## 新增实体

### ZeroMarkHit（零标记命中）

一次扫描在单个 SFC 内发现的可翻译字符串。

| 字段 | 类型 | 说明 | 约束 |
| --- | --- | --- | --- |
| `text` | `string` | 字符串字面量的内容值 | 必须含至少一个 CJK 字符（R4 判定），否则不入集合 |
| `start` / `end` | `number` | 字符串字面量在**模块源码**中的偏移（含引号） | 用于 magic-string overwrite；引号内替换 |
| `source` | `'template' \| 'script'` | 来源段 | 模板含文本节点/插值/绑定属性三种子型 |
| `ignored` | `boolean` | 是否被忽略注释覆盖 | `true` 则不提取、不改写 |

校验规则：`text` 去重后与显式管线提取文本合并为同一 `Set` 进入翻译；`start/end` 必须落在该段（template/script）AST 节点边界内。

### ExplicitCallRange（显式调用点区间）

AST 识别出的显式调用点所覆盖的字符串实参区间。零标记扫描跳落此区间内的字符串——这是 FR-008"不二次处理"的机制载体。与 `ZeroMarkHit` 同一 AST pass 产出。

### IgnoreMarker（忽略标记）

| 语法 | 段 | 作用范围 |
| --- | --- | --- |
| `/* autoi18n-ignore */` | script | 紧随其后的一个语句内的全部字符串字面量 |
| `<!-- autoi18n-ignore -->` | 模板 | 紧随其后的一个元素的文本与绑定表达式 |

无状态、无配置项；识别逻辑独立成模块（`scan/ignore.ts`）便于单测。

### ScanConfig（扫描配置）

`Autoi18nPluginConfig` 新增可选字段，随插件实例独立生效：

| 字段 | 类型 | 必填 | 默认 | 语义 |
| --- | --- | --- | --- | --- |
| `autoScan` | `boolean` | 否 | `true` | 零标记扫描总开关；`false` 时本版本全部新增行为关闭，插件等价 v0.1.0 |
| `exclude` | `(string \| RegExp)[]` | 否 | `[]` | 模块 id/路径匹配规则，命中任一即该文件跳过零标记扫描（显式管线不受影响） |

### RewrittenModule（改写产物）

| 组成 | 说明 |
| --- | --- |
| `code` | 原 SFC 源码应用零标记 overwrite + 注入块后的产物 |
| `map` | `magic-string` 生成的 sourcemap（`hires: true`），仅当发生改写/注入时返回 |
| 注入块 | import `autoi18nInfo`/`translateHashKey` + 子集消息表（JSON.stringify 序列化）+ 本地查表函数 `_localeTranslate`（缺词条回退原文） |

生命周期：仅存在于 transform 返回值；子集表内容 = 本模块零标记 ∪ 显式命中文案的缓存译文。

## 状态与生命周期

```text
构建期（transform，单 .vue 模块）:
  SFC 源码
    → parse（@vue/compiler-sfc 拆段；解析失败 → 跳过零标记扫描，走既有显式路径）
    → AST pass（模板段 + script 段）：产出 ExplicitCallRange（排除区）+ ZeroMarkHit[]（含 ignored 过滤）
    → 与既有 checkQuestions（显式正则提取）合并去重 → 翻译管线（优先级不变）→ 缓存合并 + 防抖落盘
    → magic-string：零标记 overwrite（跳过显式区）→ 注入块（dev 与 prod 均注入）
    → 既有显式路径（devInjectMessages 注入点共用 + devTransformMethod 字符扫描，行为不变）
    → return { code, map } 或原 code

运行期: autoi18nInfo.locale（reactive）+ 注入子集表 → _localeTranslate 查表 → 回退原文——
        与显式路径共享同一语言状态，语言切换响应式一致
```

## 关键派生规则

- **词条键**：零标记文本与显式文本使用同一 `translateHashKey`（内容 MD5），无新增键空间
- **去重**：`Set<string>` 合并两来源提取文本后再调用翻译函数，翻译调用次数不因来源双轨而翻倍
- **安全回退链**：SFC 解析失败 → 跳过零标记（显式路径照常）；翻译失败 → 警告跳过；运行时缺词条 → 原文；`inject` 依赖不存在（import 形态无此问题）——任何一环失败都不中断构建、不白屏
