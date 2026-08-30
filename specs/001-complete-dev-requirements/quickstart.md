# Quickstart: 补齐开发基本要求（v0.0.2）验证指南

**Date**: 2026-08-24

本指南给出可运行的端到端验证场景，证明 v0.0.2 交付的工程能力真实生效。全部场景**离线可用**（无 API Key、无外网依赖）。

## 前置条件

- Node ≥ 18、pnpm ≥ 9（与 `package.json` 的 `packageManager` 对齐）
- Git（Windows 下为 Git for Windows / Git Bash）
- 克隆仓库并安装依赖（`prepare` 脚本会自动激活 husky 钩子）：

```sh
git clone <repo-url> auto-i18n && cd auto-i18n
pnpm install
```

## 场景 1：全量测试一条命令（US1 / SC-001）

```sh
pnpm test          # 单元 + 集成 + Use Case（Vitest）
pnpm test:e2e      # e2e（Playwright，自动启动 dev server 于 3001 端口）
```

**预期**：两者退出码均为 0；`pnpm test` 输出各层用例通过汇总；`pnpm test:e2e` 自动拉起演示应用并全部通过。首次运行 e2e 前需 `pnpm exec playwright install chromium`。

**反向验证（测试真的在测）**：临时修改 `src/autoi18n/utils/translate.ts` 中 `translateHashKey` 的前缀（如 `'autoi18n'` → `'x'`）后重跑 `pnpm test`，必须失败；改回后恢复通过。

## 场景 2：提交规范门禁（US2 / SC-002）

```sh
git commit --allow-empty -m "不合规的提交信息"   # 预期：被 commit-msg 钩子拒绝，退出非零
git commit --allow-empty -m "test: 验证提交规范" # 预期：提交成功
```

完成后 `git reset --hard HEAD~1` 清理验证提交。

## 场景 3：类型安全校验（FR-009）

```sh
pnpm type-check    # 预期：零错误退出；源码与 tests/e2e 均在检查范围
```

## 场景 4：CI 触发（US3 / SC-003）

向 `main` push 或开启指向 `main` 的 PR，在仓库 Actions 页观察 `CI` 工作流自动运行并变绿；工作流步骤与 [contracts/engineering-contracts.md](./contracts/engineering-contracts.md) C3 一致，且不包含任何部署步骤。

## 场景 5：Issue 模板与双语文档（US4/US5 / SC-004/SC-005）

- 仓库页 Issues → New issue：出现 Bug 报告 / 功能建议两个模板，字段与 C4 契约一致
- 仓库首页默认渲染英文 README，一次点击进入 `README.zh-CN.md`
- `CHANGELOG.md` 存在且包含 0.0.1 与 0.0.2 两节

## 测试分层速览

| 层 | 目录/命令 | 被测对象 | 环境 |
| --- | --- | --- | --- |
| 单元 | `tests/unit` · `pnpm test:unit` | 纯函数（提取/hash/注入/替换）、文件读写、Vue 插件 install 与 autoTranslate | Node / jsdom（按文件） |
| 集成 | `tests/integration` | autoi18nPlugin 在真实 `vite build` 管线中的转换 | Node |
| Use Case | `tests/usecase` | buildStart→transform→buildEnd 全流程（读缓存→采集→mock 翻译→保存） | Node |
| e2e | `e2e/specs` · `pnpm test:e2e` | 演示应用真实浏览器行为（渲染/插值/交互） | Chromium |
