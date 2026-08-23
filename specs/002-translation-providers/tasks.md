---
description: "Task list for feature implementation"
---

# Tasks: 核心翻译能力——多翻译源接入（v0.0.3）

**Input**: Design documents from `/specs/002-translation-providers/`

**Prerequisites**: plan.md ✅, spec.md ✅, research.md ✅, data-model.md ✅, contracts/translation-providers.md ✅, quickstart.md ✅

**Tests**: 项目宪法要求 TDD——每个功能点先写失败测试再实现（tests 全离线，stub `global.fetch`）。

**Organization**: 按用户故事分组（US1 免费默认 / US2 LLM / US3 自定义契约），支持独立实现与验证。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1/US2/US3）
- 任务描述含精确文件路径

## Path Conventions

单项目：`src/`、`tests/`、`e2e/` 于仓库根（库源码在 `src/autoi18n/`）。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 基线确认，无新初始化需求（工程基线 v0.0.2 已就绪）

- [ ] T001 运行 `pnpm type-check && pnpm test` 确认既有基线全绿（记录用例数作为 SC-005 基准）

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 三种翻译源共同依赖的纯函数层：语言代码映射 + 共享翻译协议（从 `zhipuai.ts` 抽取泛化）

### Tests (先写、确认失败)

- [ ] T002 [P] 新增 `tests/unit/utils-language.spec.ts`：`toIsoLocale` 映射（zh→zh-CN、en→en、jp→ja、ara→ar、fra→fr）、未知值返回 null（FR-009）
- [ ] T003 [P] 新增 `tests/unit/translates-shared.spec.ts`：LLM 提示词构造（含目标语种中文名、`<...>` 包裹、保留 `{xx}` 指令）；`extractContentBetweenTags` 提取；`checkTranslateQuestions` 缓存过滤（完整命中不返回、部分命中只返回缺失项、空列表→空）；`translateMessage` 折叠（键=`translateHashKey(src)`、源语言回填、多目标合并）；chatCompletions 响应条数≠请求条数→丢弃（FR-006/FR-008）

### Implementation

- [ ] T004 [P] 实现 `src/autoi18n/utils/language.ts`（`toIsoLocale`）并在 `src/autoi18n/utils/index.ts` 导出（T002 转 绿）
- [ ] T005 实现 `src/autoi18n/translates/shared.ts`：`buildTranslatePrompt`、`extractContentBetweenTags`、`checkTranslateQuestions`、`translateMessage`、`chatCompletionsTranslate`（通用 OpenAI 兼容客户端：baseUrl 拼接容错、Bearer 头、`choices[0].message.content` 解析、条数校验、错误→警告+null）；`src/autoi18n/translates/index.ts` 导出（T003 转绿）

**Checkpoint**: 共享层就绪；`pnpm test` 全绿

---

## Phase 3: User Story 1 - 零配置默认翻译（免费三方） (Priority: P1) 🎯 MVP

**Goal**: 未配置 `translate` 与有效 `aiModelConfig` 时，自动用免费翻译（MyMemory 主 + Google gtx 备）完成翻译，零配置跑通全流程（FR-001/FR-004/FR-010）

**Independent Test**: 空 `Autoi18nPluginConfig`（无 translate/aiModelConfig）驱动 buildStart→transform→buildEnd，stub fetch 返回 MyMemory/Google 假响应，翻译缓存被写入且后续命中缓存不再发请求

### Tests (先写、确认失败)

- [ ] T006 [P] [US1] 新增 `tests/unit/translates-free.spec.ts`：MyMemory 请求（`langpair=zh-CN|en` 形式、q 为原文）与响应解析（`responseData.translatedText`、`responseStatus!==200`/`quotaFinished`→失败）；Google gtx 请求（`client=gtx&sl&tl&dt=t`）与嵌套数组解析（`data[0][0][0]`）；MyMemory 失败→Google 回退（同一条文本）；双链失败→跳过该条仅警告；questions 为空→直接 null 且零 fetch；缓存完整命中→零 fetch；返回键=`translateHashKey(原文)` 且源语言回填、多目标合并；未知目标语言（ISO 映射缺失）跳过并警告（FR-004/FR-009/FR-010/FR-011）
- [ ] T007 [P] [US1] 新增 `tests/unit/translates-provider.spec.ts`（调度基础部分）：无任何翻译配置→返回免费源且打印一次性提示；`config.translate` 存在→直接返回该函数；`aiModelConfig.model` 为未知枚举/apiKey 空→警告并回退免费源（FR-001）
- [ ] T008 [US1] 扩展 `tests/usecase/translate-workflow.spec.ts`：免费源完整工作流（stub fetch）——buildStart 读缓存→transform 触发免费翻译→buildEnd 落盘新增译文；免费源整体失败（fetch reject）→仅警告、原代码返回、不落盘（FR-007）

### Implementation

- [ ] T009 [US1] 实现 `src/autoi18n/translates/free.ts`：`freeTranslate`（`TranslateFunction` 签名；服务链 MyMemory→Google 逐条回退；每条×每目标一次请求；失败警告跳过；先 `checkTranslateQuestions` 过滤缓存）（T006 转绿）
- [ ] T010 [US1] 实现 `src/autoi18n/translates/provider.ts`：`resolveTranslateFunction(config)` 三级优先级（custom > LLM(有效) > free），模块级一次性提示去重；在 `src/autoi18n/translates/index.ts` 与 `src/autoi18n/index.ts` 导出 `freeTranslate`、`resolveTranslateFunction`（T007 转绿）
- [ ] T011 [US1] 修改 `src/autoi18n/autoi18nPlugin.ts`：`transform` 中的分支逻辑收敛为 `resolveTranslateFunction(config)`；`devTransformModule` 的 `await translate(...)` 包 try/catch（异常→警告+返回原代码，FR-007）；插件 `version` 常量 `'0.0.1'`→`'0.0.3'`（T008 转绿）

**Checkpoint**: US1 独立可验证——空配置即可免费翻译；`pnpm test` 全绿；提交 commit ①

---

## Phase 4: User Story 2 - 配置 LLM API Key 翻译 (Priority: P2)

**Goal**: OpenAI Chat Completions 兼容 LLM 翻译（可配 baseUrl/apiKey/model），智谱直连行为保持（FR-002/FR-003）

**Independent Test**: `aiModelConfig={model: OPENAI, config:{apiKey,baseUrl,model}}` 时按兼容格式发请求并解析译文（stub fetch 断言 URL/头/体）；`model: ZHIPUAI` 时沿用既有 glm-4 行为

### Tests (先写、确认失败)

- [ ] T012 [P] [US2] 新增 `tests/unit/translates-openai.spec.ts`：请求格式（`{baseUrl}/chat/completions` 拼接与尾 `/` 容错、默认 `https://api.openai.com/v1`、`Authorization: Bearer`、body 含 `model` 与批量提示词）；响应 `<...>` 提取折叠；条数不符→该目标整批丢弃→null；fetch 非 200/reject→警告+null；缓存完整命中→零 fetch（FR-002/FR-006/FR-008）
- [ ] T013 [P] [US2] 扩展 `tests/unit/translates-provider.spec.ts`：`model: OPENAI` 且 apiKey/model 齐备→返回 OpenAI 源；OPENAI 缺 model→警告回退免费；`model: ZHIPUAI`→返回智谱源（优先级与有效性规则）
- [ ] T014 [US2] 扩展 `tests/usecase/translate-workflow.spec.ts`：OpenAI 工作流（stub fetch）全流程落盘

### Implementation

- [ ] T015 [US2] 实现 `src/autoi18n/translates/openai.ts`：`openaiTranslate`（基于 `shared.chatCompletionsTranslate`，默认 baseUrl/model 常量）并在 `translates/index.ts`、`src/autoi18n/index.ts` 导出（T012 转绿）
- [ ] T016 [US2] 重构 `src/autoi18n/translates/zhipuai.ts`：内部委托 `shared.chatCompletionsTranslate`（baseUrl=`https://open.bigmodel.cn/api/paas/v4`、model 默认 `glm-4`，保留 `zhipuaiTranslate` 公开签名与导出）；`pnpm test` 既有用例不回退（FR-003）（T013 转绿）
- [ ] T017 [US2] `src/autoi18n/translates/provider.ts` 增加 OPENAI 分支与有效性校验（apiKey 空或 model 缺→警告回退免费）（T013/T014 转绿）
- [ ] T018 [US2] 类型扩展：`src/autoi18n/@types/enum.ts` 增加 `TranslateAIModel.OPENAI='openai'`；`src/autoi18n/@types/autoi18nPlugin.d.ts` 的 `AIModelConfig` 增加 `model?: string`（`pnpm type-check` 通过）

**Checkpoint**: US2 独立可验证——配置任一兼容 LLM 即可翻译；`pnpm test` 全绿；提交 commit ②

---

## Phase 5: User Story 3 - 自定义翻译接口契约 (Priority: P3)

**Goal**: `TranslateFunction` 契约固化为一等公民公开导出，优先级最高且独占（FR-001/FR-005/FR-007/FR-012）

**Independent Test**: 同时提供 `translate` 与 `aiModelConfig` 时仅自定义函数被调用；自定义函数抛异常不中断构建

### Tests (先写、确认失败)

- [ ] T019 [P] [US3] 新增 `tests/unit/index-exports.spec.ts`：断言入口导出 `autoi18n`、`autoi18nPlugin`、`freeTranslate`、`openaiTranslate`、`zhipuaiTranslate`、`resolveTranslateFunction`、`toIsoLocale`、`TranslateAIModel.OPENAI/ZHIPUAI`、`TranslateTarget` 全成员（FR-005 契约导出）
- [ ] T020 [US3] 扩展 `tests/usecase/translate-workflow.spec.ts`：优先级用例——config 同时含 `translate` 与有效 `aiModelConfig`，仅自定义函数被调用（fetch stub 计数为 0）；自定义函数抛异常→警告+原代码+不落盘（FR-001/FR-007）

### Implementation

- [ ] T021 [US3] 核对/补齐 `src/autoi18n/index.ts` 公开导出与 `@types/` 类型再导出（`TranslateFunction`、`AIModelConfig`、`TranslateAIModelConfig` 等类型对库使用方可见）（T019/T020 转绿）

**Checkpoint**: US3 独立可验证；`pnpm test` 全绿；提交 commit ③

---

## Phase 6: Demo 接入验证（SC-001 端到端）

**Purpose**: 用演示应用模拟"其他 Vue+Vite 项目接入"

- [ ] T022 修改 `vite.config.ts`：`resolve.alias` 增加 `auto-i18n-vue → src/autoi18n/index.ts`（本地源验证未发布能力）；`aiModelConfig` 改为环境变量存在才配置（`ZHIPUAI_API_KEY` 或 `OPENAI_API_KEY`+`OPENAI_BASE_URL`+`OPENAI_MODEL`），否则走免费默认；`pnpm dev` 手动确认 demo 正常
- [ ] T023 按 `specs/002-translation-providers/quickstart.md` §2 做一次性免费翻译真实验证（备份→清空 `public/translate.json`→`pnpm dev`→确认免费译文生成→恢复备份），把结果记录到 quickstart 或 CHANGELOG 备注
- [ ] T024 运行 `pnpm test:e2e` 确认演示应用 e2e 在本地源 alias 下仍全绿（SC-005）；提交 commit ④

---

## Phase 7: Polish & Cross-Cutting Concerns

- [ ] T025 重新生成构建产物：`pnpm ts:build`（`src/autoi18n/buildJs/`、`buildTypes/` 随源码更新）；`pnpm plugin:build` 确认库构建成功
- [ ] T026 版本与文档：`package.json` version→`0.0.3`；`CHANGELOG.md` 增加 0.0.3 条目（三种翻译模式、用法示例）；`README.md`/`README.zh-CN.md` 更新"翻译源配置"章节（中英同步）；`docs/requirements.md` v0.0.3 节末追加"实现补充说明"（免费源选型与实测记录、优先级规则）；`specs/002-translation-providers/spec.md` Status→Complete；提交 commit ⑤
- [ ] T027 循环 code review：对全部改动做系统性审查（正确性/边界/类型安全/契约一致性/测试有效性），修复全部中等及以上严重问题后复跑 `pnpm type-check && pnpm test && pnpm test:e2e`；如产生修复，逐修复提交
- [ ] T028 终验：`pnpm type-check && pnpm test:all` 全绿（SC-004/SC-005 达成）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Phase 1**：无依赖，即时开始
- **Phase 2**：依赖 Phase 1；**阻塞全部用户故事**（free/openai/zhipuai 均依赖 shared 协议与语言映射）
- **Phase 3 (US1)**：依赖 Phase 2——MVP 交付点（免费默认路径完整可用）
- **Phase 4 (US2)**：依赖 Phase 2（T017 依赖 T010 的 provider 骨架）
- **Phase 5 (US3)**：依赖 Phase 2（T020 依赖 T011 的 try/catch 与调度）
- **Phase 6**：依赖 Phase 3（demo 默认路径需免费源就绪）
- **Phase 7**：依赖全部前序阶段

### User Story Dependencies

- **US1 (P1)**：Phase 2 后即可开始，不依赖 US2/US3
- **US2 (P2)**：Phase 2 后即可开始；T017 修改 US1 创建的 provider.ts（追加分支，不破坏 US1 行为）
- **US3 (P3)**：Phase 2 后即可开始；复用 US1 的调度与异常包裹，仅核对导出与优先级语义

### Within Each User Story

- 测试先写并确认失败 → 实现 → 转绿 → 提交该功能点 commit
- 纯函数（映射/协议）在 provider 之前；provider 在插件接线之前

### Parallel Opportunities

- T002/T003（不同测试文件）可并行
- T006/T007 可并行；T012 与 T019 可并行（不同文件）
- 三个 US 在 Phase 2 完成后可由多人并行开发

## Parallel Example: User Story 1

```bash
# 先并行写两个失败测试：
Task: "T006 free provider 单测 in tests/unit/translates-free.spec.ts"
Task: "T007 调度器单测 in tests/unit/translates-provider.spec.ts"
# 再顺序实现 free.ts → provider.ts → autoi18nPlugin.ts 接线 → usecase
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 基线 → 2. Phase 2 共享层 → 3. Phase 3 US1（免费默认）
4. **STOP and VALIDATE**: 空配置 demo 即可自动翻译（SC-001）——本版本核心验证点

### Incremental Delivery

1. US1 免费默认（MVP）→ 2. US2 LLM 扩展 → 3. US3 契约固化 → 4. Demo 验证 → 5. 文档/review/终验

---

## Notes

- 全部测试离线：`vi.stubGlobal('fetch', ...)` 按 URL 分发假响应（形状来自 research.md R1 实测）
- 禁止真实调用任何收费 API；免费接口真实验证仅 T023 一次性执行
- `TranslateTarget` 枚举值、缓存键格式、`TranslateFunction` 签名为兼容性红线，不可变更
- 提交粒度：commit ①US1 ②US2 ③US3 ④demo ⑤文档版本，修复类提交独立于功能提交
