# Tasks: 补齐开发基本要求（v0.0.2）

**Input**: Design documents from `/specs/001-complete-dev-requirements/`

**Prerequisites**: plan.md (required), spec.md (required for user stories), research.md, data-model.md, contracts/engineering-contracts.md, quickstart.md

**Tests**: 本特性交付物主体即测试体系；TDD 顺序为"先写失败测试/验证脚本 → 再落配置实现"。

**Organization**: Tasks are grouped by user story to enable independent implementation and testing of each story.

## Format: `[ID] [P?] [Story] Description`

- **[P]**: Can run in parallel (different files, no dependencies on incomplete tasks)
- **[Story]**: Which user story this task belongs to (e.g. US1, US2, US3)
- Include exact file paths in descriptions

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 测试运行器、依赖与脚本契约就位（对应 contracts C1）

- [x] T001 安装测试与工程依赖：`pnpm add -D vitest@^1.6.0 @vue/test-utils@^2.4.0 jsdom@^24 @playwright/test @commitlint/cli@^19 @commitlint/config-conventional@^19 husky@^9`（落盘 package.json、pnpm-lock.yaml）
- [x] T002 [P] 创建 `vitest.config.ts`（include `tests/**/*.{test,spec}.ts`，默认 environment node，e2e/ 不纳入）与 `tests/setup.ts`（`vi.stubGlobal('require', createRequire(...))` 供 Node 分支文件读写使用）并接线 setupFiles
- [x] T003 在 package.json 增加 `packageManager: "pnpm@10.17.1"` 与脚本 `test`/`test:all`/`test:watch`/`test:unit`/`test:integration`/`test:usecase`/`test:e2e`/`type-check`/`prepare`（与 contracts/engineering-contracts.md C1 逐字一致；`test:all` 满足 FR-005"单条命令全部测试含 e2e"）

---

## Phase 2: User Story 1 - 完整的自动化测试体系 (Priority: P1) 🎯 MVP

**Goal**: `pnpm test` + `pnpm test:e2e` 一条命令跑通四层测试并全绿（FR-001~FR-006）

**Independent Test**: 按 quickstart.md 场景 1（含反向验证：改坏 `translateHashKey` 前缀必须红）

### Implementation for User Story 1（测试即交付物，逐层落地）

- [x] T004 [P] [US1] 单元测试 `tests/unit/utils-translate.spec.ts`：translateTargetText 全枚举与未知值、detectionTranslateMsg/detectionTranslateText（$translate/autoTranslate、带 options、无匹配）、translateHashKey（MD5 确定性、自定义/空前缀）、checkQuestions、devTransformMessages 结构、devInjectMessages（script 标签后注入）、devTransformMethod（$translate→_localeTranslate、autoTranslate(→_localeTranslate(）
- [x] T005 [P] [US1] 单元测试 `tests/unit/utils-file.spec.ts`（Node 环境 + docblock jsdom 分文件）：readTranslateJson/writeTranslateJson 经临时文件往返（`os.tmpdir()`）、空文件/非法 JSON 容错返回 {}、浏览器分支 reject；readJsonFile 在 jsdom 下用 stubbed XMLHttpRequest 验证 200/非 200/非法 JSON 三态
- [x] T006 [P] [US1] 单元测试 `tests/unit/autoi18n.spec.ts`（jsdom + Vue Test Utils）：install 设置 locale/targets（含 locale 不在 targets 时自动前插）、provide `$autoi18n`/`$translate`、filePath 非 .json 不读取；autoTranslate 命中返回译文、未命中回退原文、{key} 插值
- [x] T007 [US1] 集成测试夹具 `tests/integration/fixtures/app/`：index.html、src/main.ts（createApp + 挂载）、src/Hello.vue（模板含 `$translate(\`你好，世界\`)` 与带 options 的 `$translate` 调用）——静态提交，运行时只读
- [x] T008 [US1] 集成测试 `tests/integration/plugin-build.spec.ts`：编程式 `vite build`（configFile:false、root=夹具、build.write:false、plugins=[vue(), autoi18nPlugin({isDev:true, translate:字典mock, readTranslateContent, saveTranslateContent})]），断言产物 chunk 含 `_localeTranslate`、注入的译文常量，且原 `$translate(` 调用被替换
- [x] T009 [US1] Use Case 测试 `tests/usecase/translate-workflow.spec.ts`：真实 autoi18nPlugin 钩子编排 buildStart(读入 mock 缓存)→transform(含新文本的 .vue 源码, 字典 mock 翻译)→buildEnd(捕获保存内容)；断言缓存保留、新译文按 hash 键合并、isDev 注入代码、isTranslate 置位触发保存、无新翻译时不保存
- [x] T010 [US1] e2e：`e2e/playwright.config.ts`（webServer `pnpm dev` 端口 3001、`reuseExistingServer: !process.env.CI`、baseURL http://localhost:3001、testDir e2e/specs）+ `e2e/specs/home.spec.ts`（访问 `/#/`，断言 `个人介绍` 渲染、`公司名称：` 插值文案存在、点击 `切换用户` 后用户名变化）
- [x] T011 [US1] 全量验证：`pnpm test` 与 `pnpm test:e2e` 本机全绿（e2e 前先 `pnpm exec playwright install chromium`），并执行 quickstart.md 场景 1 的反向验证

**Checkpoint**: US1 独立可测。**Commit（功能点分组）**：① 测试基础设施+单元测试（T001-T006）② 集成测试（T007-T008）③ Use Case 测试（T009）④ e2e（T010-T011）

---

## Phase 3: User Story 2 - Git 提交规范强制 (Priority: P2)

**Goal**: 不合规 commit message 被本地钩子 100% 拦截（FR-007，contracts C2）

**Independent Test**: quickstart.md 场景 2（不合规拒绝 / 合规通过 / 历史风格兼容）

- [x] T012 [P] [US2] 创建 `commitlint.config.cjs`（`module.exports = { extends: ['@commitlint/config-conventional'] }`）
- [x] T013 [US2] 创建 `.husky/commit-msg`（单行 `pnpm exec commitlint --edit "$1"`，husky v9 纯脚本格式）并执行 `pnpm prepare` 激活
- [x] T014 [US2] 行为验证：`git commit --allow-empty -m "不合规信息"` 被拒；`"test: 验证提交规范"` 通过（验证后 reset）；用 `git log` 抽样历史 message 逐条过 commitlint 确认历史风格兼容

**Checkpoint**: US2 独立可测。**Commit**：⑤ 提交规范（T012-T014）

---

## Phase 4: User Story 3 - CI 自动校验 (Priority: P2)

**Goal**: main push / PR 自动触发校验工作流，仅校验不部署（FR-008、FR-009，contracts C3）

**Independent Test**: quickstart.md 场景 3/4（本地 type-check 通过；推送后 Actions 触发变绿）

- [x] T015 [US3] 创建 `.github/workflows/ci.yml`：`on: push branches [main] + pull_request branches [main]`；ubuntu-latest；pnpm/action-setup@v4（读 packageManager）→ actions/setup-node@v4（node 22、cache pnpm）→ `pnpm install --frozen-lockfile` → `pnpm type-check` → `pnpm test` → Playwright 浏览器缓存（~/.cache/ms-playwright，key 含 playwright 版本）→ `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`；无任何部署步骤
- [x] T016 [US3] 验证 type-check 脚本覆盖源码与 tests/e2e（必要时以最小改动在 tsconfig include 或独立 tsconfig.test.json 纳入），本机 `pnpm type-check` 零错误

**Checkpoint**: US3 独立可测。**Commit**：⑥ CI 工作流（T015-T016；实际触发验证在推送 main 后观察，属于收尾确认）

---

## Phase 5: User Story 4 - 标准化 Issue 提交 (Priority: P3)

**Goal**: Bug 报告与功能建议两类结构化模板（FR-010，contracts C4）

**Independent Test**: quickstart.md 场景 5（新建 Issue 页出现两模板、字段齐全）

- [x] T017 [P] [US4] 创建 `.github/ISSUE_TEMPLATE/bug_report.yml`（GitHub Forms：问题描述/复现步骤/期望行为/实际行为/环境信息必填，截图日志选填，中英双语标签）
- [x] T018 [P] [US4] 创建 `.github/ISSUE_TEMPLATE/feature_request.yml`（问题描述/期望方案必填，备选方案/补充信息选填，中英双语标签）

**Checkpoint**: US4 独立可测。**Commit**：⑦ Issue 模板（T017-T018）

---

## Phase 6: User Story 5 - 双语文档与版本更新说明 (Priority: P2)

**Goal**: 默认英文 README + 中文版互链 + CHANGELOG（FR-011、FR-012，contracts C5）

**Independent Test**: quickstart.md 场景 5（首页默认英文、一键切中文、CHANGELOG 两版本齐备）

- [x] T019 [US5] 重写 `README.md` 为英文（项目简介/支持范围/安装/使用：main.ts 与 vite.config.ts 接入示例/自定义 translate 说明/License），顶部 `[简体中文](./README.zh-CN.md)` 链接
- [x] T020 [US5] 创建 `README.zh-CN.md`（迁移原中文内容并与英文版对齐结构），顶部 `[English](./README.md)` 链接
- [x] T021 [US5] 创建 `CHANGELOG.md`（Keep a Changelog + SemVer 头；0.0.1 依 git 历史补录、0.0.2 记录本次全部工程能力）并将 package.json `version` 提升至 `0.0.2`

**Checkpoint**: US5 独立可测。**Commit**：⑧ 双语 README（T019-T020）⑨ CHANGELOG 与版本号（T021）

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 收尾质量闭环（对应开发基本要求的流程项）

- [x] T022 specs 文档收尾：specs/001-complete-dev-requirements 各产物标记完成状态（含 checklist 更新）
- [x] T023 循环 code review：对本特性全部新增文件做系统性审查（正确性、跨平台、安全、与契约一致性），修复**中等严重及以上**问题并复测，循环至清零
- [x] T024 执行 quickstart.md 全部验证场景（1-5）并记录结果（含 SC-003 的 CI 运行时长观测，目标 <10min）；确认工作树清洁、全部提交符合"一功能点一 commit"

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始（T001 先行；T002/T003 依赖 T001）
- **US1 (Phase 2)**: 依赖 Phase 1（vitest 可运行）
- **US2 (Phase 3)**: 依赖 T001（husky/commitlint 已安装），与 US1 可并行
- **US3 (Phase 4)**: 依赖 T011（CI 要跑的测试须全绿）与 T016 依赖 T003
- **US4 (Phase 5)**: 无代码依赖，任意时点可并行
- **US5 (Phase 6)**: 建议最后（CHANGELOG 需汇总 US1-US4 结果）
- **Polish (Phase 7)**: 依赖全部故事完成

### User Story Dependencies

- **US1 (P1)**: MVP 主体，最先完成
- **US2 (P2)**: 独立；仅依赖依赖安装（T001）
- **US3 (P2)**: 依赖 US1 的测试命令全绿（CI 内容物）
- **US4 (P3)**: 完全独立
- **US5 (P2)**: 独立，但内容上收尾时做

### Parallel Opportunities

- T002 与 T003（不同文件）可并行
- T004、T005、T006（三个不同 spec 文件）可并行
- T012 与 US1 各任务可并行；T017 与 T018 可并行

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → 2. Phase 2 US1 → **STOP and VALIDATE**（quickstart 场景 1）

### Incremental Delivery

Setup → US1（测试体系）→ US2（提交规范）→ US3（CI）→ US4（Issue 模板）→ US5（文档）→ Polish（review 循环 + quickstart 全场景）

每完成一个功能点组按 ①-⑨ 分组提交，commit message 遵循 C2 契约。

---

## Notes

- zhipuai 网络层不做真实请求测试（research.md R3）；Use Case 层经 `translate` 注入点覆盖其包装逻辑
- Vue 锁定 3.3.4、Vite 锁定 4.3.9，任何任务不得升级（PROJECT.md 已知问题）
- Windows（Git Bash）与 CI（ubuntu）双环境同命令可用是硬约束
- 现有构建/发布脚本（plugin:build、push:npm:package 等）行为不得改变
