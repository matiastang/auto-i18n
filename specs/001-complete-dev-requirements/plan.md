# Implementation Plan: 补齐开发基本要求（v0.0.2）

**Branch**: `001-complete-dev-requirements` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/001-complete-dev-requirements/spec.md`

## Summary

对照 docs/requirements.md 的"开发基本要求"清单逐项检查后，现状缺口为：**测试体系（完全缺失）**、**commitlint+husky 提交规范（缺失）**、**GitHub Actions CI（缺失）**、**Issue 模板（缺失）**、**双语 README（仅中文）**、**CHANGELOG（缺失）**；已有项为 git、pnpm、TypeScript、uv（文档化）。本计划以"测试体系"为核心，用 Vitest 覆盖 src/autoi18n 全部核心模块（单元/集成/Use Case），用 Playwright 驱动现有演示应用做 e2e，再补齐工程门禁（commitlint+husky）、CI（main push/PR 校验）、Issue 模板与双语文档。所有测试离线可运行：AI 翻译通过插件既有的 `translate` 自定义函数注入点用字典 mock 替代，绝不真实调用智谱 API。

## Technical Context

**Language/Version**: TypeScript 5.1（严格模式），Node ≥ 18（本地 v24.8.0，CI 用 22），pnpm 10.17.1

**Primary Dependencies**: 现有——Vue 3.3.4（锁定，勿升级，见 PROJECT.md）、Vite 4.3.9、@vitejs/plugin-vue 4、rollup 4、lodash、crypto-js；新增——Vitest ^1.6.0（唯一与 Vite 4.3.9 兼容的主版本，Vitest 2+ 要求 Vite 5）、@vue/test-utils ^2.4、jsdom ^24（XHR/组件挂载）、@playwright/test（最新）、@commitlint/cli + @commitlint/config-conventional ^19、husky ^9

**Storage**: 无持久化存储；翻译内容以 JSON 文件（`public/translate.json`）与内存对象（`Autoi18nMessages`）存在，测试用临时文件（`os.tmpdir()`）

**Testing**: Vitest（单元 + 集成 + Use Case，Node/jsdom 双环境）+ Playwright（e2e）；测试金字塔见 quickstart.md

**Target Platform**: 跨平台本地开发（Windows + Git Bash 为主）与 GitHub 托管 ubuntu runner

**Project Type**: library（Vite 插件 + Vue 运行时插件，发布为 `auto-i18n-vue` npm 包）+ 内嵌演示 web 应用

**Performance Goals**: 单元/集成/Use Case 全量 < 60s；CI 全流程（含 e2e）< 10min（SC-003）

**Constraints**: 测试离线可运行（FR-006）；不得改变现有构建/发布脚本行为；Vue 锁定 3.3.4；e2e 依赖端口 3001（`strictPort`）

**Scale/Scope**: 被测核心源码约 1.3k LOC（src/autoi18n 下 13 个文件）；测试目录为新增，不侵入现有 src

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 当前仍为未定制的官方模板（占位符），无已批准的项目宪法可执行。以 docs/requirements.md 中的硬性开发要求作为事实治理原则执行，逐项核对：

| 原则（来自需求） | 本设计是否合规 |
| --- | --- |
| 测试驱动开发（先测试后代码） | 合规——tasks.md 中每个功能点先写失败测试再实现；本特性交付物主体即测试，配套实现（脚本/配置）随测试落地 |
| 完整测试（单元/集成/UseCase/e2e） | 合规——四层全覆盖，见 Project Structure |
| 一功能点一 commit | 合规——tasks.md 按功能点分组，实现阶段逐组提交 |
| 循环 code review 至无中等严重问题 | 合规——tasks.md 含收尾 review 任务 |
| CI 先只做校验 | 合规——工作流仅 install + type-check + test，无部署 |
| pnpm/uv 管理 | 合规——依赖全部经 pnpm；无 Python 业务代码，不涉及 uv 运行时 |
| TypeScript 类型安全 | 合规——新增 `type-check` 脚本并纳入 CI |

Phase 1 设计后复查：无违规，无需 Complexity Tracking 记录。

## Project Structure

### Documentation (this feature)

```text
specs/001-complete-dev-requirements/
├── plan.md              # This file ($speckit-plan command output)
├── research.md          # Phase 0 output ($speckit-plan command)
├── data-model.md        # Phase 1 output ($speckit-plan command)
├── quickstart.md        # Phase 1 output ($speckit-plan command)
├── contracts/           # Phase 1 output ($speckit-plan command)
└── tasks.md             # Phase 2 output ($speckit-tasks command - NOT created by $speckit-plan)
```

### Source Code (repository root)

```text
.github/
├── workflows/
│   └── ci.yml                     # main push/PR：install → type-check → vitest → e2e
└── ISSUE_TEMPLATE/
    ├── bug_report.yml             # Bug 报告（GitHub Forms，中英双语字段）
    └── feature_request.yml        # 功能建议（GitHub Forms，中英双语字段）

.husky/
└── commit-msg                     # commitlint --edit（husky v9 纯脚本格式）

e2e/
├── playwright.config.ts           # webServer 复用 `pnpm dev`（端口 3001），CI 不复用已有服务器
└── specs/
    └── home.spec.ts               # 演示应用首页：翻译渲染 / 插值 / 切换用户交互

tests/
├── unit/                          # jsdom/Node 混合（按文件 docblock 指定环境）
│   ├── autoi18n.spec.ts           # Vue 插件 install、autoTranslate 回退/插值（Vue Test Utils 挂载）
│   ├── utils-file.spec.ts         # Node fs 读写（stub require）、XHR readJsonFile
│   └── utils-translate.spec.ts    # 文本提取、hash key、消息注入/方法替换等纯函数
├── integration/
│   ├── fixtures/app/              # 最小 Vite 工程（入口 + 含 $translate 的 .vue）随仓库提交
│   └── plugin-build.spec.ts       # vite build（write:false）→ 产物含注入代码与译文
└── usecase/
    └── translate-workflow.spec.ts # buildStart(读缓存) → transform(采集+mock翻译) → buildEnd(保存合并)

commitlint.config.cjs              # extends @commitlint/config-conventional
vitest.config.ts                   # include tests/**，e2e/ 不在其中
README.md                          # 英文（默认）
README.zh-CN.md                    # 中文（原 README 内容迁移）
CHANGELOG.md                       # Keep a Changelog 格式，0.0.1 补录 + 0.0.2
```

**Structure Decision**: 单仓库（library + 演示应用）结构保持不变；新增 `tests/`（Vitest 三层）与 `e2e/`（Playwright）两个顶层目录，与源码隔离、互不侵入。集成测试夹具作为**随仓库提交的静态文件**（而非运行时生成），保证可复现与可审查。

## Complexity Tracking

> 无 Constitution Check 违规，无需记录。
