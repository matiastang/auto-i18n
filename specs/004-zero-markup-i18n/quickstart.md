# Quickstart: v0.2.0 验证指南

**Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

## 前置条件

- Node ≥ 18、pnpm 10.17.1；已执行 `pnpm install`（新增 3 个依赖经 package.json 声明安装）
- 自动化验证**无需任何 API Key、无需外网**（翻译调用全部 stub；演示应用文案已缓存）

## 1. 离线自动化验证（对应 SC-002/SC-003/SC-004）

```bash
pnpm type-check     # 新配置字段与扫描器类型通过
pnpm test           # 单元 + 集成 + Use Case（全离线：fetch 均 stub）
pnpm test:e2e       # 演示应用 e2e（零标记区块文案已缓存，不触发网络翻译）
```

预期：全部通过。关键用例：
- `tests/unit/scan-*.spec.ts`（新增）——CJK 判定边界、忽略标记、script/模板扫描、改写产物与 sourcemap
- `tests/integration/plugin-scan.spec.ts`（新增）——真实 vite 构建：dev 与 **production** 双模式注入子集表；`autoScan: false` 等价 v0.1.0；`exclude` 命中文件跳过
- 既有用例（utils-translate/autoi18n/provider/free/shared/usecase/integration/e2e）**零回退**——显式 API 行为不变的固化证据

## 2. 改写产物断言（对应 FR-001/FR-003/FR-005，离线单测）

给定 fixture SFC（含四类文案位置 + 误判样例），断言产物：

| 输入 | 产物预期 |
| --- | --- |
| 模板文本节点 `个人介绍` | 改写为 `_localeTranslate('个人介绍')` 形式查表调用 |
| 插值 `{{ '中文' }}` / `:placeholder="'中文'"` | 同上，表达式内字面量被改写 |
| script `const label = '中文标签'` | 字面量被改写为查表调用 |
| `obj['中文key']` 属性访问器 / `{ '中文键': v }` 对象键 | **字节原样保留**，无词条 |
| 注释中的中文 | 不提取 |
| `/* autoi18n-ignore */` 覆盖的字符串 | 原样保留，无词条 |
| 纯英文字符串 | 原样保留 |
| `has sourcemap` | 返回 `{ code, map }` 且 map 可解析 |

## 3. 演示应用人工验收（对应 SC-001，可离线）

```bash
pnpm dev            # http://localhost:3001
```

- 新增"零标记演示"区块：中文文案**未包裹任何翻译函数**，切换语言（zh/en/jp/ara）显示对应译文，响应式即时生效
- 区块内含一个被 `/* autoi18n-ignore */` 覆盖的中文串：切语言保持原文
- 检查 `public/translate.json`：区块文案词条落盘，与显式文案同格式（`autoi18n_<md5>` 键）

## 4. 生产构建验证（对应 FR-003 的 prod 分支）

```bash
pnpm build && pnpm preview
```

预期：生产产物中零标记文案显示当前语言译文（子集表已内嵌），语言切换正常；无裸中文上屏、无控制台报错。

## 5. 存量兼容验证（对应 SC-003 / FR-008）

```bash
git stash && pnpm test && git stash pop   # 对照 v0.1.0 基线（可选）
```

- 显式 `$translate` / `autoTranslate` 既有用例与 e2e 全部通过，行为与 v0.1.0 一致
- `autoScan: false` 时集成构建产物与 v0.1.0 语义等价

## 6. 库构建与版本核对（对应 SC-005）

```bash
pnpm plugin:build   # 产物含 scan/ 模块；external 覆盖 3 个新依赖
```

- `package.json` version 与 `AUTOI18N_PLUGIN_VERSION` 均为 **0.2.0**
- 双语 README 含零标记用法、忽略机制、适用边界（纯英文源不适用、拼接表达式建议显式 API）；CHANGELOG 有 v0.2.0 条目；CLAUDE.md 架构段描述 scan/ 扫描器
