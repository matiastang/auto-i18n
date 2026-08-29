---
description: "Task list for feature implementation"
---

# Tasks: 清理智谱特殊化配置（v0.0.4）

**Input**: Design documents from `/specs/003-remove-zhipuai-preset/`

**Prerequisites**: plan.md ✅、spec.md ✅、research.md ✅、data-model.md ✅、contracts/ ✅、quickstart.md ✅

**Tests**: 项目硬性要求 TDD（docs/requirements.md 开发基本要求），测试任务为必选，先写测试确认失败再实现。

**Organization**: 按用户故事分组；跨故事的契约测试统一放入 Foundational 阶段（红灯批次）。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 描述含精确文件路径

## Path Conventions

单项目结构：`src/autoi18n/`（库）+ `tests/`（四层）+ 仓库根（demo 配置与文档）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 确认基线与工作区状态

- [x] T001 基线验证：`pnpm type-check && pnpm test` 全绿、`git status` 干净后开始（当前分支 `dev/tdy`）

---

## Phase 2: Foundational (Blocking Prerequisites) — TDD 红灯批次

**Purpose**: 先改测试表达 v0.0.4 新契约（跨 US1/US2 的公开契约面），确认失败后再实现

**⚠️ CRITICAL**: 本阶段完成前不得开始任何实现任务

- [x] T002 [P] 更新 `tests/unit/index-exports.spec.ts`：移除 `zhipuaiTranslate` 导入与断言；"三种翻译源"用例改为两种（`freeTranslate`/`openaiTranslate` + 调度器）；`TranslateAIModel` 全成员用例改为仅断言 `OPENAI === 'openai'` 且 `(TranslateAIModel as never as Record<string, unknown>).ZHIPUAI === undefined`
- [x] T003 [P] 更新 `tests/unit/translates-provider.spec.ts`：删除"model=ZHIPUAI 且 apiKey 齐备"用例；新增两个用例——①"旧值 `'zhipuai'`：警告一次（含旧值与回退去向提示）并回退免费翻译源"（沿用 `loadModules`/`vi.resetModules()` 模式，`'zhipuai' as never`）；②"OPENAI 模式 + 智谱参数（`baseUrl: 'https://open.bigmodel.cn/api/paas/v4'`、`model: 'glm-4'`、智谱 key）：请求 URL/Authorization/请求体 model 与原 ZHIPUAI 模式期望逐字段一致"（承接被删智谱专项用例的断言语义，固化 FR-003/SC-001 迁移等价性）
- [x] T004 删除 `tests/unit/translates-zhipuai.spec.ts`

**Checkpoint**: `pnpm vitest run tests/unit` —— T002/T003 新断言失败（红灯）；确认失败原因正确（枚举成员仍存在/降级未发生）

---

## Phase 3: User Story 1 - 智谱用户迁移到统一 LLM 配置 (Priority: P1) 🎯 MVP

**Goal**: 库的 LLM 配置收敛为唯一形态 `OPENAI`，智谱特殊化入口全部移除（FR-001/FR-002/FR-003）

**Independent Test**: `pnpm type-check` 通过（旧引用即报错）；`pnpm vitest run tests/unit` 全绿；OPENAI 用例以智谱参数断言请求构造（URL/头/体）等价

### Implementation for User Story 1

- [x] T005 [US1] `src/autoi18n/@types/enum.ts`：删除 `TranslateAIModel.ZHIPUAI` 成员及其 JSDoc，仅保留 `OPENAI`
- [x] T006 [US1] 删除 `src/autoi18n/translates/zhipuai.ts`（整个模块：`zhipuaiTranslate`、`DEFAULT_ZHIPUAI_MODEL`、智谱 baseUrl 常量）
- [x] T007 [P] [US1] `src/autoi18n/translates/index.ts`：删除 `export * from './zhipuai'`
- [x] T008 [P] [US1] `src/autoi18n/index.ts`：删除 `zhipuaiTranslate` 的 import 与具名导出
- [x] T009 [US1] `src/autoi18n/translates/provider.ts`：删除 `zhipuaiTranslate` import 与 ZHIPUAI 调度分支（`modelConfig.model === TranslateAIModel.ZHIPUAI` 整块）
- [x] T010 [P] [US1] 注释清理：`src/autoi18n/@types/autoi18nPlugin.d.ts` 的 `model` 字段注释删除"ZHIPUAI 模式缺省 glm-4"表述；`src/autoi18n/translates/shared.ts` 文件头注释去除智谱字样（实现零改动）

**Checkpoint**: `pnpm type-check` 通过；`pnpm vitest run tests/unit/index-exports.spec.ts tests/unit/translates-provider.spec.ts` 全绿（US1 独立成立：库面已无智谱入口，迁移路径由 OPENAI 参数覆盖）

---

## Phase 4: User Story 2 - 旧配置的优雅降级 (Priority: P2)

**Goal**: 旧值 `'zhipuai'` 走通用无效配置路径：一次性警告（含迁移指引信息）+ 回退免费翻译，构建不中断（FR-004）

**Independent Test**: T003 新增用例通过；警告文案包含旧值与回退去向、且同配置多次解析仅警告一次

### Implementation for User Story 2

- [x] T011 [US2] `src/autoi18n/translates/provider.ts`：无效配置警告文案通用化——删除 OPENAI 特判的 `model` 状态三元拼接，统一输出"model 取值 + apiKey 状态 + 回退免费翻译"（覆盖旧值 `'zhipuai'` 场景，与 T003 断言对齐）

**Checkpoint**: `pnpm vitest run tests/unit/translates-provider.spec.ts` 全绿（US2 独立成立：降级行为已固化）

---

## Phase 5: User Story 3 - 文档与版本同步更新 (Priority: P3)

**Goal**: 使用者可见的文档与版本标识同步（FR-006/FR-007/FR-009）

**Independent Test**: quickstart.md §5 核对清单通过；`package.json` 与 `AUTOI18N_PLUGIN_VERSION` 均为 0.0.4

### Implementation for User Story 3

- [x] T012 [US3] `package.json`：`version` 0.0.3 → 0.0.4
- [x] T013 [P] [US3] `src/autoi18n/autoi18nPlugin.ts`：`AUTOI18N_PLUGIN_VERSION`（第 20 行附近）'0.0.3' → '0.0.4'
- [x] T014 [P] [US3] `vite.config.ts`：删除 `ZHIPUAI_API_KEY` 环境变量分支与相关注释，翻译源条件配置仅剩 `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`
- [x] T015 [P] [US3] `README.md`：翻译源清单删除 ZHIPUAI 条目；配置示例删 `ZHIPUAI_API_KEY` 分支；新增智谱迁移配置示例（`baseUrl: 'https://open.bigmodel.cn/api/paas/v4'` + `model: 'glm-4'`）
- [x] T016 [P] [US3] `README.zh-CN.md`：与 T015 同步（中文版）
- [x] T017 [P] [US3] `CHANGELOG.md`：新增 v0.0.4 条目——标注 BREAKING（`TranslateAIModel.ZHIPUAI` 与 `zhipuaiTranslate`/`DEFAULT_ZHIPUAI_MODEL` 导出移除）+ 迁移路径 + 文档清理说明
- [x] T018 [P] [US3] `CLAUDE.md`：`translates/zhipuai.ts` 相关架构表述改写为现存模块（shared/openai/free/provider）；核对"Translation source resolution"段无智谱残留

**Checkpoint**: 文档核对通过；演示应用 `pnpm dev` 可启动（无 Key 时免费兜底，行为回退非报错）

---

## Phase 6: Polish & Cross-Cutting Concerns

**Purpose**: 全量验证、评审与收尾

- [ ] T019 全量验证：`pnpm type-check && pnpm test && pnpm test:e2e && pnpm plugin:build`（对应 quickstart.md §1/§4；e2e 依赖 demo 存量缓存离线命中，即验证 FR-005 缓存解耦；`pnpm exec playwright install chromium` 已装则跳过）
- [ ] T020 循环 code review（`/code-review`）：修复中等严重及以上问题直至清零，仅余低severity才可停（开发基本要求）
- [ ] T021 提交划分核查：一功能点一 commit（Conventional Commits，破坏性变更用 `!` + `BREAKING CHANGE` footer）；勾选本文件全部任务、`specs/003/spec.md` Status 置 Complete

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**: 无依赖，立即开始
- **Phase 2**: 依赖 Phase 1；**阻塞全部实现任务**（TDD 红灯先行）
- **Phase 3 (US1)**: 依赖 Phase 2
- **Phase 4 (US2)**: 依赖 Phase 3（provider 分支删除后降级路径才成为实际行为，T003 用例转绿）
- **Phase 5 (US3)**: 依赖 Phase 3（文档描述的库面须先定型）；T012–T018 之间可并行
- **Phase 6**: 依赖 Phase 3/4/5 全部完成

### User Story Dependencies

- **US1 (P1)**: MVP——完成后"智谱不再特殊"即成立
- **US2 (P2)**: 依赖 US1 的分支删除（同一文件 `provider.ts`，顺序执行避免冲突）
- **US3 (P3)**: 依赖 US1 定型库面；与 US2 理论独立但按优先级顺序执行

### Within Each User Story

- 测试先行（Phase 2 集中完成红灯批次）
- 枚举/模块删除（T005–T008）先于调度分支删除（T009）
- 注释清理（T010）可与其他任务并行

### Parallel Opportunities

- T002/T003/T004（不同测试文件）
- T007/T008/T010（不同源文件）；T012–T018（版本/配置/四份文档互不相交）

### TDD 执行顺序说明

标准红-绿节奏：Phase 2 全部测试任务（红灯）→ Phase 3/4 实现转绿。若 T003 的降级用例在 US1 实现后才补写，则视为特征固化测试（行为已由既有无效配置路径提供），仍须保留断言。

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 基线 → Phase 2 红灯 → Phase 3 库清理
2. **STOP and VALIDATE**: type-check + 单测绿 = 库面已无智谱入口

### Incremental Delivery

1. US1（库清理）→ 2. US2（降级固化）→ 3. US3（文档/版本/demo）→ 4. Phase 6 全量验证 + 循环评审

### Commit Plan（一功能点一 commit）

| 顺序 | 类型 | 内容 | 任务 |
| --- | --- | --- | --- |
| 1 | `docs:` | v0.0.4 需求补充说明 + specs/003 全部设计产物 | （需求分析+本阶段，开工前提交） |
| 2 | `test:` | 契约测试先行：导出面/枚举/旧值降级用例，删除智谱专项测试 | T002–T004 |
| 3 | `feat!:` | 移除智谱特殊化：枚举成员、zhipuai.ts、导出、调度分支、注释清理 | T005–T010 |
| 4 | `feat!:` | 无效配置警告通用化（覆盖旧值迁移提示） | T011 |
| 5 | `chore:` | 版本同步 0.0.4（package.json + AUTOI18N_PLUGIN_VERSION） | T012–T013 |
| 6 | `chore:` | 演示应用删除 ZHIPUAI_API_KEY 分支 | T014 |
| 7 | `docs:` | 双语 README、CHANGELOG、CLAUDE.md 更新 | T015–T018 |
| 8 | `test:`/`docs:` | 全量验证后的收尾（任务勾选、spec Status） | T019–T021 |

---

## Notes

- [P] 任务 = 不同文件且无依赖
- 每个功能点完成即 commit（commitlint + husky 已启用）
- 智谱为收费接口：全部测试 stub `fetch`，禁止真实调用（测试纪律）
- `.env.local` 的 `ZHIPUAI_API_KEY` 由使用者自行迁移（research.md R5），代码侧不处理
- `buildJs/`/`buildTypes/` 为 gitignored 构建产物，T019 的 `plugin:build` 负责重新生成验证
