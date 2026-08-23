# Research: 补齐开发基本要求（v0.0.2）

**Date**: 2026-08-24 | **Status**: 完成（全部未知项已解决）

## R1: Vitest 版本与 Vite 4.3.9 的兼容性

**Decision**: 使用 `vitest@^1.6.0`（最终 1.x），而不是 2.x/3.x。

**Rationale**: Vitest 2.0 起 peer 要求 `vite ^5.0.0`；本项目锁定 Vite 4.3.9（Vue 3.3.4 锁定的连带约束，见 PROJECT.md）。Vitest 1.6.0 的 peer 为 `vite ^4.2.0 || ^5.0.0`，与本仓库完全兼容。

**Alternatives considered**: 升级 Vite 5 + Vitest 3（被否决：会连带要求处理 Vue 3.4 的 `ToggleEvent` 类型问题，超出 v0.0.2 范围，违反"不改变现有行为"边界）；Jest（被否决：需求明确指定 Vitest）。

## R2: 测试环境（Node vs jsdom）与 `require('fs')` 兼容

**Decision**: Vitest 默认 Node 环境，需要 DOM/XHR/组件挂载的文件用 docblock `// @vitest-environment jsdom` 单文件切换；Node 侧 `src/autoi18n/utils/file.ts` 中的 `require('fs')` 在测试 setup 中用 `vi.stubGlobal('require', createRequire(import.meta.url))` 补齐。

**Rationale**: 被测代码是"Node（Vite 插件侧）+ 浏览器（Vue 运行时侧）"双态模块：`readTranslateFile/writeTranslateFile` 用 `typeof window === 'undefined'` 分支并在 Node 分支调用 `require('fs')`（源码注释说明是打包约束）。Vitest 按文件粒度切换环境最贴近两种真实运行态；stub `require` 是最小侵入方案，不改源码。

**Alternatives considered**: 全局 jsdom（被否决：Node 侧文件读写的 `window === undefined` 分支永远不会命中，测不到真实路径）；改源码为静态 `import fs`（被否决：源码注释明确说明动态 require 是避免 fs 进入浏览器打包产物的刻意设计，v0.0.2 不改现有行为）。

## R3: 离线策略——如何不调用智谱 AI 又测到翻译链路

**Decision**: 全部测试经 `autoi18nPlugin` 既有的 `config.translate` 自定义函数注入点传入**字典式 mock 翻译**（src 源码级测试）；`zhipuai.ts` 的网络层不做真实请求测试，仅覆盖纯函数（apikey 校验、`<>` 提取、缓存过滤 `checkTranslateQuestions`、结果组装 `translateMessage`，通过导出路径可达的部分）。

**Rationale**: 插件设计已预留 `translate` 注入点（`vite.config.ts` 中注释 `// translate: autoi18nTranslate` 即此用途），这是官方扩展缝，用它 mock 最真实且零源码改动。zhipuai 内部 `translate()` 直接 `fetch` 外网，离线环境不可测也不应测（有费用、不稳定，违反 FR-006）。

**Alternatives considered**: mock全局 `fetch`（被否决：耦合内部实现细节，且 zhipuai 未导出可注入 fetch 的口子）；e2e 用真实 key（被否决：CI 无 key、有费用、不稳定）。

## R4: e2e 目标与离线可行性（关键风险调研）

**Decision**: e2e 直接驱动现有演示应用的 dev server（`pnpm dev`，端口 3001，hash 路由 `/#/`），断言首页中文文案渲染、插值文案与"切换用户"交互；Playwright `webServer` 负责启动/回收服务器（`reuseExistingServer: !process.env.CI`）。

**Rationale**: 经源码核实（`src/autoi18n/translates/zhipuai.ts`），全缓存命中时 `nCacheQuestions` 为空 → `translate()` 在发起 `fetch` 之前就因"没有待翻译内容"reject → 被外层 try/catch 吞掉返回 null → 插件回退注入缓存消息，**全程无网络请求**；即使存在未缓存文本，无 key 时请求 401 → `res.choices[0]` 抛错 → 同样被捕获降级，页面仍渲染。演示应用首页文本均已存在于 `public/translate.json`，因此 CI 无 key 时 e2e 依旧确定可通过，断言中文文案（zh 值 = 原文）稳定。

**Alternatives considered**: 为 e2e 单独建 fixture 应用 + mock translate（被否决：演示应用本身就是最真实的被测对象，且已验证离线可行，多一套应用增加维护面）；e2e 断言英文切换（被否决：演示应用无语言切换 UI，运行时 `autoi18nInfo` 未暴露到 window，强行注入属于侵入式改动）。

## R5: 集成测试形态（vite build 编程式调用）

**Decision**: 在 `tests/integration/plugin-build.spec.ts` 中以编程方式调用 `vite build`：`configFile: false`、`root` 指向随仓库提交的 `tests/integration/fixtures/app`、`build.write: false`，插件链为 `@vitejs/plugin-vue() + autoi18nPlugin({ translate: 字典mock, ... })`，从返回的 RollupOutput 产物中断言注入代码（`_localeTranslate`、译文常量）。

**Rationale**: 这是"插件在真实 Vite 构建管线中被加载并生效"的最小完整闭环，不写磁盘、无副作用、可重复；夹具提交进仓库保证可审查可复现。

**Alternatives considered**: 子进程跑 `vite build` CLI（被否决：慢、断言要读产物文件、清理繁琐）；只测插件 `transform` 钩子（被否决：那是单元测试，集成价值不足，已另行在 Use Case 层覆盖钩子编排）。

## R6: husky v9 + commitlint 在 Windows(Git Bash)/Linux 双环境的安装形态

**Decision**: `husky@^9` + `@commitlint/cli@^19` + `@commitlint/config-conventional@^19`；`package.json` 增加 `"prepare": "husky"`；钩子文件 `.husky/commit-msg` 内容为单行 `pnpm exec commitlint --edit "$1"`（v9 纯脚本格式，无需旧版 shebang 头）；配置文件用 `commitlint.config.cjs`（CommonJS，规避本仓库 `"type"` 未设置时的 ESM/CJS 歧义）。

**Rationale**: husky v9 钩子即纯 shell 片段，Git Bash 与 Linux 行为一致；`config-conventional` 默认规则与现有历史风格（`feat: - 中文描述`）兼容——subject 前导 `- ` 与中文不触发任何默认规则。`pnpm exec` 保证用本地安装的 commitlint。

**Alternatives considered**: husky v8（被否决：已过时，`husky install` 语法在 v9 移除）；加 pre-commit 跑全量测试（被否决：需求只要求提交信息规范，全量测试提交时运行过慢，属于过度设计）；自定义 type-enum 扩展中文 type（被否决：历史 commit 全部使用英文 type，无需扩展）。

## R7: CI 工作流形态与 pnpm 版本对齐

**Decision**: `.github/workflows/ci.yml` 触发条件 `on: push: branches: [main]` + `pull_request: branches: [main]`；ubuntu-latest；用 `pnpm/action-setup@v4`（读 `package.json` 的 `packageManager` 字段，需新增 `"packageManager": "pnpm@10.17.1"`）+ `actions/setup-node@v4`（`cache: pnpm`，Node 22）；步骤：`pnpm install --frozen-lockfile` → `pnpm type-check` → `pnpm test` → 缓存 `~/.cache/ms-playwright` → `pnpm exec playwright install --with-deps chromium` → `pnpm test:e2e`。

**Rationale**: `packageManager` 字段让 corepack/action-setup 与本地 pnpm 10.17.1 精确对齐，避免 lockfile漂移；Playwright 浏览器缓存显著缩短 CI 时间以满足 SC-003（<10min）；仅装 chromium（e2e 只跑桌面 Chromium 一档，控制时长）。

**Alternatives considered**: Node 24（被否决：22 是当前 LTS， runner 支持最成熟）；矩阵多浏览器 e2e（被否决：v0.0.2 校验性质，单浏览器足够，后续可加）；pnpm install 不带 frozen（被否决：CI 必须可复现）。

## R8: pnpm 10 默认拦截构建脚本的影响

**Decision**: 不预置 `pnpm.onlyBuiltDependencies`；若 CI 安装后 vite/esbuild 不可用再补。

**Rationale**: 经查依赖树，本仓库的关键原生依赖 `esbuild ≥0.17` 通过 optionalDependencies 分发平台二进制（postinstall 仅校验），husky/commitlint/playwright 均无必须的安装期构建脚本，pnpm 10 的默认拦截不影响。

**Alternatives considered**: 预先添加 onlyBuiltDependencies 白名单（暂不采用：引入未验证的配置，先以最小配置运行）。

## R9: type-check 命令的落点

**Decision**: 新增 `"type-check": "tsc --noEmit -p tsconfig.json"`，并把 `tests/`、`e2e/` 纳入类型检查范围（通过根 tsconfig 的 include 或独立 `tsconfig.test.json`，实现时按根 tsconfig 实际结构取最小改动方案）。

**Rationale**: 需求要求"用 TypeScript 类型系统保证类型安全"且 CI 要能机器校验；`--noEmit` 纯校验不产出文件，不动现有 `ts:build`（emit 到 buildJs/buildTypes）行为。

**Alternatives considered**: 复用 `pnpm ts:build`（被否决：会写 buildJs/buildTypes 目录，CI 产生脏产物）；vue-tsc（暂不需要：.vue 文件由插件链处理，类型检查范围以 .ts 为主，若根配置已含 .vue 相关检查再评估）。

## R10: README 双语与 CHANGELOG 策略

**Decision**: `README.md` 重写为英文（默认），原中文内容整理迁移至 `README.zh-CN.md`，两文件顶部互放语言切换链接；`CHANGELOG.md` 采用 Keep a Changelog + SemVer 头部，`0.0.1` 依据 git 历史补录（粒度到功能组），`0.0.2` 记录本次全部工程能力；同步将 `package.json` 版本号提升为 `0.0.2`。

**Rationale**: 需求明文"默认显示英文自述文档"与"需要有版本更新说明文件"；版本号与 CHANGELOG 保持一致是发布语义的最低要求。

**Alternatives considered**: 中文为主英文另存（违反"默认英文"要求）；CHANGELOG 逐 commit 罗列（可读性差，采用功能组粒度）。
