# Research: 零标记自动国际化（v0.2.0）

**Feature**: specs/004-zero-markup-i18n | **Date**: 2026-09-06

本文档解决 spec 全部技术未知项。每项按 Decision / Rationale / Alternatives 记录。

## R1: 模板段 AST 解析工具 — `@vue/compiler-sfc`（新增显式依赖）

**Decision**: 显式新增依赖 `@vue/compiler-sfc@^3.3.4`（与仓库锁定的 vue 3.3.4 同源同版本）。插件在 `enforce: 'pre'` 阶段已拿到原始 SFC 源码，用 `parse()` 拆分 SFC，模板段用其模板 AST 定位：文本节点（TEXT）、插值表达式（INTERPOLATION）内的字符串字面量、指令/绑定属性（`bind`）表达式内的字符串字面量。

**Rationale**: 仓库实测 `node_modules/.pnpm` 已有 `@vue/compiler-core@3.3.4` / `compiler-dom@3.3.4` / `compiler-sfc@3.3.4`（vue 3.3.4 的直接依赖），但 pnpm 严格结构下库源码无法 import 未声明包，必须显式声明。AST 方案是唯一能区分"文案字符串"与"属性访问器/对象键/注释"的手段（现有正则管线的 CLAUDE.md 已记录其词法妥协）。

**Alternatives**:
- 正则扫描模板段：无法区分绑定表达式结构，`obj['中文key']` 与 `'中文文案'` 同形，误改风险不可控 → 否决
- 仅 `@vue/compiler-core`：缺 SFC 拆分（script/style 块分离）能力 → 否决

**已知限制**（README 记录）：接入方 vue 版本 > 3.3 时，3.3 编译器不认识的新模板语法会解析失败——失败方向安全（该模块跳过零标记扫描、显示原文），不中断构建。

## R2: script 段 AST 解析工具 — `@babel/parser`（新增显式依赖）

**Decision**: 显式新增依赖 `@babel/parser@^7.25`，以 `plugins: ['typescript']`、容错选项解析 SFC 的 `<script>` / `<script setup>` 内容，遍历 `StringLiteral` 与无表达式插值的 `TemplateLiteral`，筛出含 CJK 字符者。

**Rationale**: 纯 JS、零 peer 依赖、同时支持 TS 与 JS 语法、容错解析（`errorRecovery`）不因个别语法失败拖垮整模块；`node_modules/.pnpm` 已有 7.25.3 传递依赖，显式声明即可。对比 `typescript` 包（80MB+、版本敏感、JS 项目未必安装）作为运行时依赖过重。

**Alternatives**:
- `typescript.createSourceFile`：体积与版本耦合不可接受 → 否决
- 正则：`obj['中文key']`（属性访问）与 `const s = '中文'`（赋值）正则无法可靠区分 → 否决

## R3: 源码改写工具 — `magic-string`（新增显式依赖）

**Decision**: 显式新增依赖 `magic-string@^0.30`。所有零标记改写基于 AST 节点 `start`/`end` 偏移做 `overwrite`；发生改写的模块 `transform` 返回 `{ code, map }`（`generateMap({ hires: true })`）。

**Rationale**: 位置精确、API 为"片段替换 + sourcemap 生成"而生；pnpm store 已有 0.30.11。多注入段（无 script SFC 追加脚本块）用 `prepend/append` 与 overwrite 同链操作，偏移自洽。

**Alternatives**:
- 自拼字符串 + 手工偏移：易错、无 sourcemap → 否决
- 绑定 rollup/esbuild 的 AST 工具：引入打包器耦合 → 否决

**边界说明**：现有显式调用点替换（`devTransformMethod` 字符扫描）保持原样、在其后执行（CLAUDE.md 记录的"模板内字符串边界"妥协仅影响其精度，不因本版本变更）；零标记链的 sourcemap 覆盖 AST 改写与注入段。显式路径退役为本版本范围之外的可选优化。

## R4: CJK 文案判定规则

**Decision**: 判定正则 `/[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/`——字符串至少含一个 CJK 统一表意字符（含扩展A）、日文假名或韩文谚文音节，即参与零标记翻译；否则跳过。全角标点（《》「」、，、！）单独不构成判定依据。

**Rationale**: 项目定位"中文即 Key"（Han 全覆盖）；目标语言含 JP（假名）故一并纳入；谚文为前瞻兼容。纯 ASCII 字符串（路由、事件名、className、`type: 'password'` 等）天然排除——这是误判防护的主要机制。

**Alternatives**:
- 仅 Han（\u4e00-\u9fff）：日文假名源文案（假名为主、无汉字）漏扫，与目标语言 JP 不符 → 扩充
- `\p{Script=Han}` Unicode 属性类：需 `u` flag，等价但可读性差、esbuild 目标兼容性需验证 → 用显式区间

## R5: 改写运行时形态 — 零标记路径专用"子集注入查表"，去 inject 化，dev/prod 一致

**Decision**: 零标记改写的调用目标为注入的本地查表函数 `_localeTranslate`；注入代码升级为 **import 模块级状态**（`import { autoi18nInfo, translateHashKey } from 'auto-i18n-vue'`）而非 `inject('$autoi18n')`。零标记路径在 **dev 与 production 均注入子集表**（生产产物中零标记文案必须显示译文，这是与显式路径的关键差异）；显式 `$translate`/`autoTranslate` 路径行为完全不变（dev 改写+注入、production 保留调用走全局查表）。

**Rationale**:
- `inject()` 仅在 setup 上下文合法——`<script setup>` 顶层可用，但普通 `<script>` 顶层调用会告警且回退原文；`autoi18nInfo` 是模块级 `reactive`（且已是公开导出，`index.ts` 无契约新增），任何位置读取均安全，模板渲染期间读取自动建立响应式依赖，语言切换照常响应
- 零标记路径在生产构建必须注入：production 下若无查表调用，裸中文将原样上屏，FR-003 直接失败
- 显式路径不改的依据：FR-008 要求显式 API 行为完全不变；其现状（production 走运行时全局查表）已验证，回归风险为零

**Alternatives**:
- dev/prod 全部统一注入（含显式调用）：逻辑统一但变更已验证的生产行为，回归面无谓扩大 → 否决
- production 把零标记文案改写为全局 `$translate('…')` 调用：模板可用但 script 内不可用，双轨不一致 → 否决

**影响**：零标记路径新增独立注入模板；现有 `devInjectMessages`/`devTransformMethod`/`devTransformMessages` 复用其消息表序列化与注入位置逻辑（无 script SFC 追加 `<script setup>` 的规则不变）。

## R6: 忽略机制语法 — 注释级 + 配置级两级

**Decision**:
- **注释级（代码范围）**：script 中 `/* autoi18n-ignore */`（作用于紧随其后的一个语句内的全部字符串字面量）；模板中 `<!-- autoi18n-ignore -->`（作用于紧随其后的一个元素的文本与绑定表达式）。扫描时按位置跳过被覆盖字符串。
- **配置级（文件粒度）**：插件配置新增 `autoScan?: boolean`（默认 `true`，FR-010）与 `exclude?: (string | RegExp)[]`（匹配模块 id/路径，命中即整文件跳过零标记扫描，显式管线不受影响）。

**Rationale**: 注释级覆盖"个别误判"粒度，配置级覆盖"整目录/文件禁用"粒度，两级组合即可满足 FR-006/FR-007；行区间等更细配置为过度设计。

**Alternatives**: 仅配置级（单条误判需排除整个文件，粒度不足）→ 否决；支持行区间配置（YAGNI）→ 否决。

## R7: 显式调用点与零标记扫描的共存规则

**Decision**: 同一次扫描内先经 AST 识别显式调用点——script 段 callee 为 `autoTranslate`（含成员表达式形式）的 `CallExpression`、模板段表达式 AST 中 `$translate` 调用——其字符串实参位置记入"显式区"，零标记扫描跳过；显式区文案仍由现有正则管线提取（`checkQuestions`）与改写（`devTransformMethod`）。两条提取路径产出的文本经同一 `Set` 去重后进入同一翻译调用。

**Rationale**: FR-008"显式调用点不被零标记扫描二次处理"由 AST 排除直接保证；词条去重由既有哈希键机制天然达成（同文本同键）。

**Alternatives**: 让显式路径也迁移到 AST 提取（替换正则）——更统一但触碰"行为完全不变"红线与 CLAUDE.md 记录的既有妥协说明，留作后续版本。

## R8: 注入位置与无 script SFC

**Decision**: 沿用 `devInjectMessages` 既有规则：无 `<script>` 块的 SFC 追加 `<script setup>` 承载注入代码；有 script 则插入首个 script 开标签之后。零标记注入与显式注入共用同一注入点，一次注入同时服务两者（子集表合并两来源文本）。

**Rationale**: 与现状一致，无新增边界。

## R9: 依赖清单与版本对齐

**Decision**: `package.json` `dependencies` 新增三项——`@vue/compiler-sfc@^3.3.4`、`@babel/parser@^7.25.0`、`magic-string@^0.30.0`；`crypto-js` 保留；无其他新增。构建产物（vite lib build）需确认三包随产物 external 处理策略（沿用现有 external 配置模式，作为依赖由接入方安装）。

**Rationale**: pnpm 严格结构下必须显式声明；三者均已是工具链传递依赖，实测版本可得，无新下载风险面。

**Alternatives**: `peerDependencies` 声明（接入方纯 JS 项目可能缺装）→ 否决；`optimizeDeps.include`（仅 dev 生效）→ 不适用于库发布场景。

## 澄清决策回执（2026-09-06）

spec 的三项范围决策在 clarify 提问中用户未即时答复，按推荐默认固化（spec Assumptions 已留修订通道）：

| 决策项 | 固化结果 |
| --- | --- |
| 扫描范围 | 仅 `.vue` 单文件组件 |
| 拼接表达式 | 首版跳过（文档建议显式 API 表达插值） |
| 默认启停 | 默认开启 + `autoScan` 配置可关 |
