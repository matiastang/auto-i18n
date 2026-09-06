# Tasks: 零标记自动国际化——构建期 AST 扫描 + 自动改写（v0.2.0）

**Input**: Design documents from `/specs/004-zero-markup-i18n/`
（[spec.md](./spec.md) | [plan.md](./plan.md) | [research.md](./research.md) | [data-model.md](./data-model.md) | [contracts/plugin-config.md](./contracts/plugin-config.md) | [quickstart.md](./quickstart.md)）

**Prerequisites**: plan.md（技术栈与结构）、spec.md（用户故事）、research.md（R1-R9 决策）、data-model.md（实体）、contracts/（配置与注入契约）、quickstart.md（验证场景）

**Tests**: 项目需求强制 TDD（先写测试、确认失败、再实现）。每个 Story 的测试任务在其实现任务之前，标注先败要求。

**Organization**: 按用户故事分组（US1 零标记核心 / US2 误判防护与忽略 / US3 显式 API 共存 / US4 文档演示版本），每阶段为可独立验证的增量。**一功能点一 commit**——每个任务或逻辑组完成后独立提交。

## Format: `[ID] [P?] [Story] Description`

- **[P]**: 可并行（不同文件、无未完成依赖）
- **[Story]**: 所属用户故事（US1-US4）
- 描述含确切文件路径

## Path Conventions

单库结构（现有仓库）：库源码 `src/autoi18n/`，测试 `tests/`，演示应用 `src/views/`、`src/Components/`。

---

## Phase 1: Setup (Shared Infrastructure)

**Purpose**: 依赖就位，扫描器可开始开发

- [x] T001 [P] 在 package.json 的 dependencies 新增 `@vue/compiler-sfc@^3.3.4`、`@babel/parser@^7.25.0`、`magic-string@^0.30.0`，执行 `pnpm install` 验证解析（research.md R9）
- [x] T002 [P] 复查 vite.build.config.ts 的 external 与产物配置覆盖三个新依赖，必要时调整；确认 `pnpm plugin:build` 可用（不要求此时产物含 scan/，仅验证构建链无断裂）

**Checkpoint**: 依赖安装成功，库构建链可用

---

## Phase 2: Foundational (Blocking Prerequisites)

**Purpose**: 所有扫描器共用的判定与类型基础；完成前不得开始任何用户故事

**⚠️ CRITICAL**: US1-US3 的扫描器全部依赖本阶段产物

### Tests for Foundational (TDD 先败)

- [x] T003 [P] 先写 `tests/unit/scan-cjk.spec.ts` 并确认失败：含 CJK 统一表意字符命中、扩展A 命中、日文假名命中、谚文命中、中英混合命中；纯 ASCII 不命中、仅全角标点（`《》「」，！`）不命中、空串/纯数字不命中（research.md R4 判定契约）
- [x] T004 [P] 先写 `tests/unit/scan-ignore.spec.ts` 并确认失败：script 中 `/* autoi18n-ignore */` 标记紧随其后一个语句内的全部字符串区间；模板中 `<!-- autoi18n-ignore -->` 标记紧随其后一个元素的文本与绑定表达式区间；大小写敏感；前后空白容忍；无标记时不产生忽略区间（contracts C-3）

### Implementation for Foundational

- [x] T005 创建 `src/autoi18n/scan/types.ts`：定义 `ZeroMarkHit`（text/start/end/source/ignored）、`ExplicitCallRange`、`ScanResult`（data-model.md 实体），类型面最小化
- [x] T006 [P] 实现 `src/autoi18n/scan/cjk.ts`：CJK 判定正则（`/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/`）与 `containsCjk(text)` 工具，T003 通过
- [x] T007 [P] 实现 `src/autoi18n/scan/ignore.ts`：对 script 源码与模板源码计算忽略区间集合（`IgnoreRange { start, end }`），T004 通过

**Checkpoint**: 判定与忽略基础就绪，扫描器开发可开始

---

## Phase 3: User Story 1 - 零标记书写文案，构建期自动翻译 (Priority: P1) 🎯 MVP

**Goal**: 接入方在 `.vue` 中直接书写中文（四类位置），构建期自动发现、翻译并改写为查表调用，运行时语言切换生效；dev 与 production 均正确

**Independent Test**: 构建一个不含任何显式翻译调用的 fixture SFC（dev 与 prod 两种模式），断言翻译词条落盘、产物含查表调用与子集注入；运行时切换语言显示译文（单测/集成离线可验证）

### Tests for User Story 1 (TDD 先败)

- [x] T008 [P] [US1] 先写 `tests/unit/scan-script.spec.ts` 并确认失败：赋值/函数实参/三元分支/数组元素/对象值中含 CJK 的字符串字面量命中且 start/end 精确；`obj['中文key']` 属性访问器排除；对象属性键 `{ '中文键': v }` 排除；import/require 路径排除；无插值模板字面量 `` `中文` `` 命中、含插值 `${}` 的模板字面量跳过；`autoTranslate(...)` 显式调用点记入排除区（ExplicitCallRange）不产出命中（research.md R7）
- [x] T009 [P] [US1] 先写 `tests/unit/scan-template.spec.ts` 并确认失败：文本节点含 CJK 命中；插值 `{{ '中文' }}` 内字面量命中；绑定属性 `:placeholder="'中文'"` 内字面量命中；事件处理器 `@click="toast('已删除')"` 内字面量命中；`$translate(...)` 显式调用点排除；纯英文文本/属性跳过；静态属性 `placeholder="中文"`（非绑定）的处理遵循 R7 决策（命中并在改写期转为绑定形式或保守跳过——实现前以测试固化所选行为）
- [x] T010 [P] [US1] 先写 `tests/unit/scan-rewrite.spec.ts` 并确认失败：改写产物中模板/script 命中字面量替换为 `_localeTranslate('<原文>')` 调用且引号内转义正确；注入块含 `import { autoi18nInfo as _autoi18nInfo, translateHashKey } from 'auto-i18n-vue'`（contracts C-2，不用 inject）与 JSON 序列化子集表；无 `<script>` 的 SFC 追加 `<script setup>` 承载注入；无 `<script setup>` 的普通 `<script>` 注入到首块开头；返回 `{ code, map }` 且 map 可解析；显式区间内字符串不被二次改写
- [x] T011 [P] [US1] 先写 `tests/integration/plugin-scan.spec.ts` 的 dev/prod 主链用例并确认失败（真实 vite 构建，翻译 stub）：dev 模式构建 fixture SFC → 翻译函数收到零标记提取文本、词条写入 saveTranslateContent 捕获、产物含查表调用；production 模式（isDev: false）→ 产物**仍含**子集注入与查表调用（FR-003 prod 分支，research.md R5）；既有显式管线 fixture 在两种模式下产物与 v0.1.0 行为一致

### Implementation for User Story 1

- [x] T012 [P] [US1] 实现 `src/autoi18n/scan/scriptScan.ts`：`@babel/parser`（plugins: ['typescript']，errorRecovery）解析 script 内容，遍历 StringLiteral/TemplateLiteral，产出 ZeroMarkHit[] 与 ExplicitCallRange[]，过滤不含 CJK 者（T008 通过）
- [x] T013 [P] [US1] 实现 `src/autoi18n/scan/templateScan.ts`：`@vue/compiler-sfc.parse` 拆段 + 模板 AST 遍历（TEXT/INTERPOLATION/绑 定属性表达式/事件处理器表达式），SFC 解析失败返回空结果安全回退（research.md R1 限制），显式 `$translate` 调用点排除（T009 通过）
- [x] T014 [US1] 实现 `src/autoi18n/scan/rewrite.ts`：magic-string 编排——按命中位置 overwrite（引号内替换）、生成注入块（复用 `devTransformMessages` 序列化子集表 + C-2 形态查表函数）、无 script SFC 追加脚本块、返回 `{ code, map }`（T010 通过；依赖 T012、T013 的产出结构）
- [x] T015 [US1] 编排接入 `src/autoi18nPlugin.ts` transform：解析 → 扫描（script+template）→ 与 `checkQuestions` 显式提取合并去重 → 既有翻译管线（优先级/缓存/防抖落盘不变）→ 零标记改写+注入（**dev 与 prod 均执行**，区别于显式路径的 isDev 早退）→ 显式路径（`devInjectMessages`/`devTransformMethod`）原样保持；`Autoi18nPluginConfig` 新增 `autoScan?`/`exclude?` 字段类型（`src/autoi18n/@types/autoi18nPlugin.d.ts`，行为接入在 US2）；T008-T011 全部通过
- [x] T016 [US1] 确认 `tests/unit/utils-translate.spec.ts` 等既有单测零回退（本任务只验证与必要微调，不改行为）

**Checkpoint**: 零标记核心链路 dev/prod 双模式可独立验证（MVP 可演示）

---

## Phase 4: User Story 2 - 误判防护与忽略机制 (Priority: P2)

**Goal**: 非文案代码零改写（AST 结构防护 + CJK 判定）；`/* autoi18n-ignore */` / `<!-- autoi18n-ignore -->` 注释级排除与 `autoScan`/`exclude` 配置级排除生效

**Independent Test**: 构建含属性访问器/对象键/注释/忽略注释/排除文件的 fixture，断言对应字符串产物字节原样、无词条；`autoScan: false` 时插件行为等价 v0.1.0

### Tests for User Story 2 (TDD 先败)

- [x] T017 [P] [US2] 扩展 `tests/unit/scan-script.spec.ts`、`tests/unit/scan-template.spec.ts`、`tests/unit/scan-rewrite.spec.ts` 并确认新增用例失败：被忽略区间覆盖的字符串不产出 ZeroMarkHit、改写产物中字节原样（contracts C-3 端到端语义）
- [x] T018 [P] [US2] 扩展 `tests/integration/plugin-scan.spec.ts` 并确认失败：`autoScan: false` 时产物与显式管线基线一致（零标记行为完全关闭）；`exclude: ['忽略目录']` 命中文件跳过零标记扫描但显式管线照常；误判防护集成断言——`obj['中文key']`/对象键/注释在产物中字节原样且无对应词条

### Implementation for User Story 2

- [x] T019 [US2] 扫描器接入忽略过滤：`src/autoi18n/scan/scriptScan.ts` 与 `templateScan.ts` 用 `scan/ignore.ts` 区间过滤命中；`scan/rewrite.ts` 跳过忽略区间（T017 通过；依赖 T012-T014）
- [x] T020 [US2] 实现 `src/autoi18nPlugin.ts` 的 `autoScan`/`exclude` 行为：`autoScan !== false` 时才执行零标记扫描（默认开启，FR-010）；`exclude` 规则（字符串包含匹配 / RegExp test）命中模块 id 即跳过零标记扫描、不影响显式管线；`exclude` 命中不打印配置内容（apiKey 纪律）（T018 通过）

**Checkpoint**: 误判防护与两级忽略可独立验证；US1 能力不受影响

---

## Phase 5: User Story 3 - 显式 API 逃生舱共存 (Priority: P3)

**Goal**: 同一项目/同一文件内显式 `$translate`/`autoTranslate` 与零标记写法共存无冲突；显式 API 全链路行为与 v0.1.0 逐字节一致（FR-008）

**Independent Test**: 构建"显式 + 零标记"混合 fixture，断言显式调用点改写恰一次、零标记文案改写、词条按同键合并唯一；既有全量测试套件零回退

### Tests for User Story 3 (TDD 先败)

- [x] T021 [P] [US3] 先写 `tests/unit/scan-mixed.spec.ts` 并确认失败：混合 fixture 中显式调用点改写为 `_localeTranslate(` 恰一次（无双重改写/嵌套包裹）；零标记文案独立改写；两来源文本合并为同一 `Set` 后仅触发一次翻译调用集合（data-model.md 去重规则）
- [x] T022 [P] [US3] 先写 `tests/integration/plugin-scan.spec.ts` 混合构建用例并确认失败：混合文件词条落盘无重复键（同文案显式/零标记同 `autoi18n_<md5>` 键）；插值场景 `autoTranslate(\`…{name}…\`, { name })` 行为与 v0.1.0 一致

### Implementation for User Story 3

- [x] T023 [US3] 修复混合场景实现至 T021/T022 通过（预期改动集中在 `src/autoi18nPlugin.ts` 编排顺序：零标记改写先于显式字符扫描替换，区间互斥已由 ExplicitCallRange 保证；若发现显式正则提取与 AST 提取边界冲突，以显式管线优先、零标记让位原则处理）
- [x] T024 [US3] 显式 API 回归验证：全量既有测试（`tests/unit/`、`tests/usecase/`、既有 `tests/integration/`、e2e）零回退；`pnpm type-check` 通过；结果记录进本任务勾选说明

**Checkpoint**: 混合写法与存量兼容可独立验证

---

## Phase 6: User Story 4 - 文档、演示与版本同步 (Priority: P4)

**Goal**: 演示应用 dogfood 零标记能力；双语 README/CHANGELOG/CLAUDE.md 更新；版本同步 0.2.0

**Independent Test**: `pnpm dev` 演示页零标记区块切语言生效、忽略示例保持原文；文档人工核对；版本两处一致

### Implementation for User Story 4

- [x] T025 [US4] 演示应用新增零标记区块（`src/views/autoi18nHome.vue`）：未包裹中文文案（文本节点/插值/绑定属性/script 字面量四类）+ 一个 `/* autoi18n-ignore */` 忽略示例 + 与显式写法的同义对照；补充演示文案到 `public/translate.json` 缓存（沿用既有 54 条缓存的离线纪律，翻译 stub 或一次性免费源预生成，不入 CI）
- [x] T026 [US4] e2e 用例（`tests/e2e/`）：零标记区块切换语言（zh/en）显示对应译文、响应式生效；忽略示例串切换语言保持原文；显式区块回归通过
- [x] T027 [P] [US4] 更新双语 README（`README.md`/`README.zh-CN.md`）：零标记用法示例、忽略注释契约（C-3）、`autoScan`/`exclude` 配置、适用边界（纯英文源文本不适用、拼接表达式建议显式 API、vue>3.3 新语法安全回退）、与显式 API 共存说明
- [x] T028 [P] [US4] 更新 `CHANGELOG.md`（v0.2.0 条目：新能力、新增依赖、默认开启说明、边界）与 `CLAUDE.md`（架构段新增 `scan/` 扫描器与零标记管线描述、注入形态 C-2 说明）
- [x] T029 [US4] 版本同步：`package.json` version 0.1.0 → 0.2.0；`src/autoi18n/autoi18nPlugin.ts` 的 `AUTOI18N_PLUGIN_VERSION` '0.1.0' → '0.2.0'（版本漂移陷阱，两处一致）
- [x] T030 [US4] 补充 `docs/requirements.md` v0.2.0 小节"实现补充说明"：三项 clarify 默认固化回执（仅 .vue / 拼接跳过 / 默认开启）、新增依赖清单、注入形态升级说明（沿用 v0.0.3 起的文档惯例）

**Checkpoint**: 演示可看、文档可查、版本一致

---

## Phase 7: Polish & Cross-Cutting Concerns

**Purpose**: 跨故事收尾与质量门

- [x] T031 [P] `pnpm plugin:build` 全量库构建：产物含 scan/ 模块、external 覆盖三个新依赖、types 产物完整（dist/ 无越界引用，ts:build rootDir 纪律）
- [x] T032 全量质量门：`pnpm test:all`（vitest + playwright）与 `pnpm type-check` 全绿；测试 100% 离线复核（无真实收费 API 调用路径）
- [x] T033 循环 code review 并修复中等严重及以上问题，直到没有中等严重问题（需求硬性要求；重点：AST 改写边界、误判防护、显式行为不变、注入代码在接入方项目的可解析性）
- [ ] T034 运行 `specs/004-zero-markup-i18n/quickstart.md` 全流程验证并记录结果（含 autoScan:false 存量兼容与生产构建验证）
- [ ] T035 [P] 更新 `specs/004-zero-markup-i18n/checklists/requirements.md` 与 spec.md 状态为 Complete（沿用 specs/003 收尾惯例）

---

## Dependencies & Execution Order

### Phase Dependencies

- **Setup (Phase 1)**: 无依赖，立即开始；T001 必须先于一切扫描器编码（import 可解析）
- **Foundational (Phase 2)**: 依赖 Phase 1；**阻塞全部用户故事**（T003-T004 先败 → T005-T007 实现）
- **US1 (Phase 3)**: 依赖 Phase 2；MVP，最优先
- **US2 (Phase 4)**: 依赖 US1（扫描器/改写器骨架），在其上接入忽略与配置
- **US3 (Phase 5)**: 依赖 US1（混合场景），建议在 US2 后执行（回归基线更完整）
- **US4 (Phase 6)**: 依赖 US1-US3 能力就绪（演示与文档描述最终行为）
- **Polish (Phase 7)**: 依赖全部故事完成

### User Story Dependencies

- US1 独立可交付（MVP）；US2 依赖 US1 的扫描器实现；US3 依赖 US1 的编排；US4 依赖前三者
- 每 Story 内：测试任务先写并确认失败 → 实现任务 → Checkpoint 验证

### Parallel Opportunities

- Phase 1：T001 ∥ T002
- Phase 2：T003 ∥ T004（先败）；T006 ∥ T007（实现，T005 先行）
- Phase 3：T008 ∥ T009 ∥ T010 ∥ T011（先败，四个不同文件）；T012 ∥ T013（两个扫描器互不依赖）
- Phase 4：T017 ∥ T018（先败）
- Phase 5：T021 ∥ T022（先败）
- Phase 6：T027 ∥ T028 ∥（T025 → T026 串行）
- Phase 7：T031 ∥ T035，其余串行

## Parallel Example: User Story 1

```bash
# 先败测试四件套（互相独立）：
Task: "tests/unit/scan-script.spec.ts"
Task: "tests/unit/scan-template.spec.ts"
Task: "tests/unit/scan-rewrite.spec.ts"
Task: "tests/integration/plugin-scan.spec.ts（主链用例）"

# 实现期两个扫描器并行：
Task: "src/autoi18n/scan/scriptScan.ts"
Task: "src/autoi18n/scan/templateScan.ts"
```

---

## Implementation Strategy

### MVP First (User Story 1 Only)

1. Phase 1 Setup → Phase 2 Foundational
2. Phase 3 US1 → **STOP and VALIDATE**：dev/prod 双模式集成测试 + 演示页手验
3. 此时零标记核心能力已可发布评估

### Incremental Delivery

1. Setup + Foundational → 基础就绪
2. US1 → 验证（MVP！）
3. US2 → 验证（防护与忽略）
4. US3 → 验证（共存与回归）
5. US4 → 验证（演示/文档/版本）
6. Polish → quickstart 全流程 + code review 循环收尾

### Commit 纪律（需求硬性：一功能点一 commit）

- T001/T002：`chore: 新增零标记扫描所需依赖`
- T003-T007：`feat: CJK 判定与忽略标记基础模块`（或拆两个 commit）
- T008-T016：按"script 扫描 / 模板扫描 / 改写注入 / 插件编排"分四个 commit
- T017-T020：`feat: 忽略机制与扫描配置开关`
- T021-T024：`fix/test: 显式与零标记混合共存`
- T025-T030：演示、文档、版本各自独立 commit
- T031-T035：`chore: v0.2.0 收尾`

---

## Notes

- [P] = 不同文件、无未完成依赖
- [Story] 标签对应 spec.md 用户故事，保证可追溯
- 每个测试任务必须先运行确认**失败**（TDD 红灯）再进入实现
- 翻译网络调用一律 stub（v0.0.3 起纪律）；演示缓存预生成，e2e 离线
- 遇到 spec 未覆盖的 AST 边界（如 `v-html`、动态组件属性）：保守跳过不改写，并在 CLAUDE.md 边界清单记录——安全方向优先
- 任何发现与 specs/004 冲突的实现约束：回填 research.md 决策记录，不静默偏离
