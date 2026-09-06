# Implementation Plan: 零标记自动国际化——构建期 AST 扫描 + 自动改写（v0.2.0）

**Branch**: `004-zero-markup-i18n` | **Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/004-zero-markup-i18n/spec.md`

## Summary

v0.2.0 让"中文即 Key"从口号变为默认行为：接入方在 `.vue` 单文件组件中直接书写中文文案，不再需要 `$translate` / `autoTranslate` 包裹。构建期（`enforce: 'pre'` 的 transform）新增 **AST 扫描器**：模板段用 `@vue/compiler-sfc` 定位文本节点、插值与绑定属性中的字符串字面量；script 段用 `@babel/parser` 遍历字符串字面量；以"含 CJK 字符"为文案判定（不含 CJK 一律不动，属性访问器/对象键/注释被 AST 结构天然排除）。命中文案经 **`magic-string`** 按 AST 位置改写为运行时查表调用并产出 sourcemap，进入与显式 API 完全相同的翻译管线（同哈希键、同翻译源优先级、同缓存文件），词条合并且不重复。零标记路径在 dev 与 production 均注入子集查表代码（生产产物零标记文案必须显示译文）；显式 API 行为完全不变（FR-008），AST 先行识别显式调用点避免二次处理。提供注释级（`/* autoi18n-ignore */` / `<!-- autoi18n-ignore -->`）与配置级（`autoScan` 开关默认开、`exclude` 文件排除）两级忽略机制。同步更新双语 README、CHANGELOG、CLAUDE.md，版本升至 0.2.0。

## Technical Context

**Language/Version**: TypeScript 5.1（沿用现有 tsconfig），Node ≥ 18，pnpm 10.17.1

**Primary Dependencies**: 新增 3 个显式依赖——`@vue/compiler-sfc@^3.3.4`（模板 AST，与锁定 vue 3.3.4 同源）、`@babel/parser@^7.25`（script 字符串扫描，TS/JS 通吃、容错解析）、`magic-string@^0.30`（按 AST 位置改写 + sourcemap）。三者均已存在于 pnpm store（vite/vue 工具链传递依赖），仅缺显式声明。既有依赖零变化（Vue 3.3.4、Vite 4.3.9 锁定，crypto-js 保留）

**Storage**: 翻译缓存 JSON（`public/translate.json`，键 `autoi18n_<md5>`）**结构与契约完全不变**——零标记文案与显式文案共享同一词条空间，仅新增来源

**Testing**: Vitest 1.6（单元/集成/Use Case，node 环境 + stub `fetch`）+ Playwright（e2e，离线存量缓存命中）；新增扫描/改写/忽略的单元用例与真实 vite 构建集成用例

**Target Platform**: 构建期 Vite 插件（Node）+ 运行时 Vue 插件（浏览器，本版本仅注入代码形态升级，无 API 变更）

**Project Type**: library（`auto-i18n-vue`）+ 内嵌演示 web 应用

**Performance Goals**: 零标记扫描为构建期一次性成本，与现有正则提取同量级；单模块（千行级 SFC）扫描+改写开销不显著拖慢 dev 构建（集成测试中以构建通过为底线，不做微观基准）

**Constraints**: 测试 100% 离线（不调收费 API）；Vue/Vite 版本锁死；`TranslateTarget` 枚举与缓存键格式不可变；显式 API 行为完全不变（FR-008）；接入方 vue > 3.3 时新模板语法解析失败必须安全回退（跳过不翻译，不中断构建）；`AUTOI18N_PLUGIN_VERSION` 与 `package.json` 同步升至 0.2.0；一功能点一 commit；TDD

**Scale/Scope**: 新增源码模块约 3 个（SFC 扫描器、script 扫描器、忽略标记工具，预计 +500 行级）；改造 `autoi18nPlugin.ts` transform 流程与注入模板；`Autoi18nPluginConfig` 新增 2 个可选字段（`autoScan`/`exclude`）；测试新增约 4-5 个 spec 文件；文档 4 个文件；演示应用新增零标记区块。预计净变更 +800/-100 行级

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 仍为未定制模板（与 specs/002、003 处理一致）。以 docs/requirements.md 的硬性开发要求为事实治理原则：

| 原则（来自需求） | 本设计是否合规 |
| --- | --- |
| 测试驱动（先测试后代码） | 合规——先以 fixture SFC 表达扫描/改写/忽略的预期产物，确认失败后再实现扫描器 |
| 完整测试（单元/集成/UseCase/e2e） | 合规——单测覆盖 AST 判定/忽略/边界；集成用真实 vite 构建（dev + production 双模式）；e2e 走演示页零标记区块 |
| 一功能点一 commit | 合规——按"依赖声明 / script 扫描器 / 模板扫描器 / 改写与注入 / 配置开关与排除 / 演示 / 文档版本"分组提交 |
| 循环 code review 至无中等问题 | 合规——tasks.md 收尾任务 |
| 测试只用假数据，不调收费 API | 合规——翻译调用全部 stub，集成测试用既有缓存/免费源不入 CI |
| TypeScript 类型安全 | 合规——新配置字段带类型；AST 节点位置访问以最小类型面收窄 |
| pnpm 管理包 | 合规——新增依赖经 pnpm 声明安装 |
| 每版本需求完成后循环 code review | 合规——见 tasks.md 收尾 |

Phase 1 设计后复查：无违规，无需 Complexity Tracking 记录。

## Project Structure

### Documentation (this feature)

```text
specs/004-zero-markup-i18n/
├── plan.md              # 本文件
├── research.md          # Phase 0：R1-R9 技术决策（AST 工具/判定规则/注入形态/忽略语法/依赖清单）
├── data-model.md        # Phase 1：扫描结果/改写计划/忽略范围/配置契约的实体与不变量
├── quickstart.md        # Phase 1：验证指南（离线测试 + 演示应用零标记验收）
├── contracts/
│   └── plugin-config.md # Phase 1：插件配置契约（新增 autoScan/exclude）与注入代码契约
├── checklists/
│   └── requirements.md  # specify 阶段质量清单（已通过）
└── tasks.md             # Phase 2（$speckit-tasks 生成）
```

### Source Code (repository root)

```text
src/autoi18n/
├── @types/
│   └── autoi18nPlugin.d.ts        # 修改：Autoi18nPluginConfig 新增 autoScan?/exclude? 字段
├── scan/                          # 新增目录：零标记扫描器
│   ├── cjk.ts                     # 新增：CJK 判定正则与工具（R4）
│   ├── ignore.ts                  # 新增：注释级忽略标记识别（R6）
│   ├── scriptScan.ts              # 新增：@babel/parser script 字符串扫描（R2）
│   ├── templateScan.ts            # 新增：@vue/compiler-sfc 模板扫描（R1）
│   └── rewrite.ts                 # 新增：magic-string 改写与注入编排（R3/R5/R8）
├── utils/
│   └── translate.ts               # 修改：导出既有 devInjectMessages/devTransformMessages 复用（不动行为）
└── autoi18nPlugin.ts              # 修改：transform 编排（AST 扫描 → 翻译 → 改写+注入 → 显式路径不变）；AUTOI18N_PLUGIN_VERSION '0.1.0' → '0.2.0'
package.json                       # 修改：dependencies 新增 3 项；version 0.1.0 → 0.2.0
vite.build.config.ts               # 复查：external 与产物配置覆盖新依赖
tests/
├── unit/
│   ├── scan-cjk.spec.ts           # 新增：CJK 判定边界
│   ├── scan-ignore.spec.ts        # 新增：忽略标记识别
│   ├── scan-script.spec.ts        # 新增：script 扫描（赋值/实参/三元/属性访问器排除/对象键排除/注释排除）
│   ├── scan-template.spec.ts      # 新增：模板扫描（文本节点/插值/绑定属性/显式调用点排除）
│   ├── scan-rewrite.spec.ts       # 新增：改写与注入产物断言（含 sourcemap 生成、无 script SFC）
│   └── index-exports.spec.ts      # 修改：如有导出面变化则同步
├── integration/
│   └── plugin-scan.spec.ts        # 新增：真实 vite 构建（dev 注入子集表 / production 也注入；autoScan=false 与 exclude 生效）
└── usecase/e2e                    # 新增/修改：演示页零标记区块用例
src/views/…（演示应用）             # 修改：新增零标记演示区块（含忽略注释示例）
README.md / README.zh-CN.md / CHANGELOG.md / CLAUDE.md   # 文档更新
```

**Structure Decision**: 完全沿用现有单库结构；新增 `src/autoi18n/scan/` 子目录承载零标记扫描器（与 `translates/`、`utils/` 平级），职责单一、便于独立单测。插件主流程只增不改语义：AST 扫描产出的文本并入现有 `checkQuestions` 结果集合，改写与注入在显式路径之后追加。

## Complexity Tracking

> 无宪法违规，无需记录。
