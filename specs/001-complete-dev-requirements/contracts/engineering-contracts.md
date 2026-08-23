# Contracts: 补齐开发基本要求（v0.0.2）

**Date**: 2026-08-24

本特性不改变对外的库 API（`auto-i18n-vue` 包导出保持不变）。新增契约全部是**工程接口**：命令行脚本契约、提交信息契约、CI 触发契约、Issue 表单契约、文档文件契约。以下每一项都有对应的机器或人工校验。

## C1: package.json 脚本契约（CLI 接口）

| 脚本 | 命令 | 行为契约 | 校验方 |
| --- | --- | --- | --- |
| `test` | `vitest run` | 运行 `tests/unit`、`tests/integration`、`tests/usecase` 全部用例，不写仓库内文件，退出码 0/1 反映结果 | 本地 + CI |
| `test:all` | `pnpm test && pnpm test:e2e` | **单条命令运行全部测试（含 e2e）**（FR-005/SC-001） | 本地 |
| `test:watch` | `vitest` | 同 `test` 但 watch 模式 | 本地 |
| `test:unit` | `vitest run tests/unit` | 仅单元层 | 本地 |
| `test:integration` | `vitest run tests/integration` | 仅集成层 | 本地 |
| `test:usecase` | `vitest run tests/usecase` | 仅 Use Case 层 | 本地 |
| `test:e2e` | `playwright test` | 启动/复用 dev server（3001）后运行 `e2e/specs/**`，结束后回收（非复用模式） | 本地 + CI |
| `type-check` | `tsc --noEmit -p tsconfig.json`（含 tests/e2e） | 纯类型校验，零产物 | 本地 + CI |
| `prepare` | `husky` | 安装依赖后激活 git hooks | 本地 + CI |

既有脚本（`dev`、`build`、`ts:build`、`plugin:build` 等）**契约不变**。

## C2: 提交信息契约（commitlint）

- 规则集：`@commitlint/config-conventional` 默认集（Conventional Commits 1.0.0）
- 格式：`<type>(<scope>?): <subject>`；`type ∈ {feat, fix, docs, style, refactor, perf, test, build, ci, chore, revert}`
- 现有历史风格 `feat: - 中文描述` **必须继续合法**（默认规则已满足，禁止收紧到破坏历史风格的规则）
- 执行点：`.husky/commit-msg` → `pnpm exec commitlint --edit "$1"`；不合规提交以非零退出拒绝

## C3: CI 触发与步骤契约（GitHub Actions）

- 触发：`push` 到 `main`；`pull_request` 目标 `main`。其他分支 push **不**触发
- 单 job `verify`（ubuntu-latest，Node 22，pnpm = `packageManager` 字段值）按序执行：
  1. `pnpm install --frozen-lockfile`
  2. `pnpm type-check`
  3. `pnpm test`
  4. Playwright chromium 安装（带浏览器缓存）
  5. `pnpm test:e2e`
- 约束：**只校验不部署**——工作流不得包含任何 publish/deploy 步骤；任何步骤失败 → job 失败 → PR 显示红叉（branch protection 可据此设门禁）

## C4: Issue 模板契约（GitHub Forms）

- `.github/ISSUE_TEMPLATE/bug_report.yml`：必填——问题描述、复现步骤、期望行为、实际行为、环境信息（浏览器/Node/包版本）；选填——截图/日志
- `.github/ISSUE_TEMPLATE/feature_request.yml`：必填——问题描述、期望方案；选填——备选方案、补充信息
- 字段标签中英双语（中文为主、英文括注），模板对匿名未登录用户同样可用（不依赖 GitHub 专属特性之外的控件）

## C5: 文档文件契约

- `README.md`：英文，仓库首页默认渲染；顶部含 `[简体中文](./README.zh-CN.md)` 切换链接；内容覆盖项目简介、支持范围、安装、使用（main.ts + vite.config.ts 接入示例）
- `README.zh-CN.md`：与英文版内容对应，顶部含 `[English](./README.md)` 链接
- `CHANGELOG.md`：文件头声明 Keep a Changelog + SemVer；版本节倒序；`0.0.1`（补录）与 `0.0.2` 齐备；与 `package.json` 的 `version` 一致性由人工 review 保证
