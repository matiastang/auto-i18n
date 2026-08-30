# Data Model: 补齐开发基本要求（v0.0.2）

**Date**: 2026-08-24

本特性为工程基础设施补齐，**不引入新的业务数据实体**，也不修改现有实体。测试体系围绕以下既有实体构建（定义于 `src/autoi18n/@types/`，此处仅描述测试视角的契约，字段细节以源类型为准）。

## 既有实体（测试视角）

### Autoi18nMessages（翻译消息表）

- 形态：`{ [hashKey]: { [locale]: 译文 } }`，即"哈希键 → 各语言译文"的扁平映射
- 来源三态（测试需覆盖全部）：
  1. 磁盘态：`public/translate.json` / 临时 JSON 文件（`readTranslateJson` / `writeTranslateJson`）
  2. 插件态：Vite 插件 `buildStart` 读入、`transform` 合并（lodash `merge`）、`buildEnd` 保存的 `autoi18nPluginInfo.messages`
  3. 运行时态：Vue 插件 `install` 经 XHR 拉取写入 `autoi18nInfo.messages`
- 关键不变量：合并为**深合并不覆盖**（缓存优先保留既有语言项）；新译文按键追加

### Autoi18nConfig / Autoi18nPluginConfig（两套配置）

- `Autoi18nConfig`（运行时，Vue `app.use`）：`filePath`（.json 结尾才拉取）、`locale`、`targets`
- `Autoi18nPluginConfig`（构建期，Vite 插件）：`isDev`、`locale`、`targets`、`aiModelConfig` 或 **`translate` 注入点（测试的唯一离线缝）**、`readTranslateContent` / `saveTranslateContent`
- 测试关注的行为规则：`locale` 不在 `targets` 中时运行时插件自动将其前插（`autoi18n.ts:77-82`）；`filePath` 非 .json 后缀时不发起读取

### 状态转换（Use Case 层验证的主线）

```text
buildStart ──readTranslateContent──▶ messages = 缓存
    │
transform(.vue) ──checkQuestions 提取──▶ 待翻译文本
    │    ──translate(mock字典)──▶ 新译文
    │    ──merge──▶ messages = 缓存 ∪ 新译文, isTranslate = true
    │    ──isDev? 注入 _localeMessages + 替换 $translate/autoTranslate
    ▼
buildEnd ──isTranslate?──▶ saveTranslateContent(messages) 持久化
```

## 新增静态资产（非业务实体，作为数据对待）

| 资产 | 位置 | 校验规则 |
| --- | --- | --- |
| 集成测试夹具应用 | `tests/integration/fixtures/app/` | 含 `index.html`、入口 `main.ts`、至少一个使用 `$translate` 的 `.vue` 组件；作为 vite build 的 root 提交，运行时只读 |
| Playwright 浏览器缓存 | CI `~/.cache/ms-playwright` | 以 `@playwright/test` 版本为缓存 key |
| CHANGELOG 版本条目 | `CHANGELOG.md` | Keep a Changelog 格式；每个已发布版本一节，最新在上 |
