# Implementation Plan: 核心翻译能力——多翻译源接入（v0.0.3）

**Branch**: `002-translation-providers` | **Date**: 2026-08-24 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/002-translation-providers/spec.md`

## Summary

v0.0.3 把插件从"仅智谱 GLM"升级为**三级翻译源体系**：自定义翻译函数（最高优先）> LLM（新增 OpenAI Chat Completions 兼容通用客户端，智谱重构为它的一个预置参数实例）> 免费三方翻译（**MyMemory 为主、Google gtx 为备的回退链**，零配置默认启用）。新增语言代码 ISO 映射（`jp→ja` 等）、共享的 LLM 批量翻译协议模块（提示词/`<...>` 解析/缓存过滤/结果折叠）、统一的 `resolveTranslateFunction` 调度器，插件 `transform` 只依赖调度器；翻译调用统一 try/catch，任何源失败仅警告不中断构建。全部自动化测试离线（stub `global.fetch`，假响应形状来自真实免费接口探测记录，见 research.md R1/R6）；演示应用通过本地 alias 验证"外部 Vue+Vite 项目零配置接入"全流程。

## Technical Context

**Language/Version**: TypeScript 5.1（沿用现有 tsconfig，`strict: false` 保持不变），Node ≥ 18，pnpm 10.17.1

**Primary Dependencies**: 现有——Vue 3.3.4（锁定）、Vite 4.3.9（锁定）、@vitejs/plugin-vue 4、rollup 4、lodash（merge）、crypto-js（MD5 键）；**零新增依赖**（HTTP 用 Node 18+ 内置 fetch，JSON 解析用原生）

**Storage**: 翻译缓存 JSON 文件（`public/translate.json`，键 `autoi18n_<md5>` → `{zh, en, ...}`）不变；无数据库

**Testing**: Vitest 1.6（单元/集成/Use Case，node 环境 + stub fetch）+ Playwright（e2e，离线稳定：demo 文案已全量缓存）

**Target Platform**: Vite 插件运行于 Node（构建期翻译）；Vue 运行时插件运行于浏览器（本版本不动）

**Project Type**: library（`auto-i18n-vue`：Vite 插件 + Vue 运行时插件）+ 内嵌演示 web 应用

**Performance Goals**: 单次模块翻译的免费请求数 = 未缓存文案数 × 目标语言数（逐条请求，无并发）；全量测试 < 90s（新增用例控制在 +30s 内）

**Constraints**: 测试 100% 离线（FR-011）；不得调用收费 API；Vue 3.3.4 / Vite 4.3.9 不升级；现有构建/发布脚本不改；`TranslateTarget` 枚举值不可变（存量缓存兼容）；一功能点一 commit；TDD

**Scale/Scope**: 新增 src 约 6 个文件（~500 LOC）+ 测试 4 个文件（~600 LOC）；重构 `zhipuai.ts`、`autoi18nPlugin.ts`（transform 分支收敛）；不改运行时 `autoi18n.ts`

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 仍为未定制模板。以 docs/requirements.md 的硬性开发要求为事实治理原则：

| 原则（来自需求） | 本设计是否合规 |
| --- | --- |
| 测试驱动（先测试后代码） | 合规——tasks.md 每个功能点先写失败测试（stub fetch 断言请求/解析/错误路径）再实现 |
| 完整测试（单元/集成/UseCase/e2e） | 合规——新增单测 4 组 + Use Case（免费/LLM 两条工作流）+ 既有 e2e 保持通过 |
| 一功能点一 commit | 合规——按"语言映射 / OpenAI 兼容源 / 免费源 / 调度接线 / demo 验证 / 文档"分组提交 |
| 循环 code review 至无中等问题 | 合规——tasks.md 收尾任务 |
| 测试只用假数据或免费三方、不调收费 API | 合规——自动化测试全 stub；真实调用仅对 MyMemory/Google 免费接口做一次性人工验证并记录 |
| TypeScript 类型安全 | 合规——`AIModelConfig.model` 等新类型走 `@types/`，`type-check` 保持通过 |
| pnpm 管理包 | 合规——零新增依赖 |

Phase 1 设计后复查：无违规，无需 Complexity Tracking 记录。

## Project Structure

### Documentation (this feature)

```text
specs/002-translation-providers/
├── plan.md              # 本文件
├── research.md          # Phase 0：免费接口实测、LLM 标准选型等 7 项决策
├── data-model.md        # Phase 1：翻译源/配置/缓存实体
├── quickstart.md        # Phase 1：验证指南（离线测试 + 一次性免费真实验证）
├── contracts/
│   └── translation-providers.md   # 公开契约：TranslateFunction、插件配置、枚举、provider 函数
├── checklists/
│   └── requirements.md  # specify 阶段质量清单
└── tasks.md             # Phase 2（$speckit-tasks 生成）
```

### Source Code (repository root)

```text
src/autoi18n/
├── @types/
│   ├── enum.ts                    # 修改：TranslateAIModel 增加 OPENAI='openai'
│   ├── autoi18nPlugin.d.ts        # 修改：AIModelConfig 增加 model?: string
│   └── (index.d.ts / autoi18n.d.ts 不变)
├── translates/
│   ├── shared.ts                  # 新增：共享翻译协议（LLM 提示词构造、<...> 提取、
│   │                              #       缓存过滤 checkTranslateQuestions、结果折叠 translateMessage、
│   │                              #       通用 chatCompletions 请求与解析）
│   ├── openai.ts                  # 新增：OpenAI 兼容翻译源（baseUrl/apiKey/model 可配）
│   ├── free.ts                    # 新增：免费翻译源（MyMemory 主 + Google gtx 备，逐条回退）
│   ├── provider.ts                # 新增：resolveTranslateFunction 三级优先级调度
│   ├── zhipuai.ts                 # 重构：委托 shared 的通用客户端，保留 glm-4 预置与公开签名
│   └── index.ts                   # 修改：导出全部 provider
├── utils/
│   ├── language.ts                # 新增：toIsoLocale 语言代码映射（zh→zh-CN, jp→ja, ara→ar, fra→fr）
│   └── (file.ts / translate.ts / index.ts 不变)
├── index.ts                       # 修改：导出 provider 函数与语言映射
├── autoi18nPlugin.ts              # 修改：transform 收敛为 resolveTranslateFunction 调度 +
│                                  #       devTransformModule 翻译调用 try/catch；版本号 0.0.1→0.0.3
├── buildJs/ + buildTypes/         # 重新生成（ts:build 产物，随源码提交）
└── (autoi18n.ts 运行时不动)

tests/
├── unit/
│   ├── utils-language.spec.ts     # 新增：ISO 映射（含未知语言返回 null）
│   ├── translates-shared.spec.ts  # 新增：提示词构造/标签提取/缓存过滤/结果折叠/条数校验
│   ├── translates-openai.spec.ts  # 新增：请求格式（URL/头/体）、响应解析、错误→null
│   ├── translates-free.spec.ts    # 新增：MyMemory 解析、Google 解析、回退链、配额/网络错误路径
│   └── translates-provider.spec.ts# 新增：三级优先级、配置不完整回退免费+警告
├── usecase/
│   └── translate-workflow.spec.ts # 扩展：免费源工作流（stub fetch 全流程）+ OpenAI 工作流
└── (integration / e2e 既有用例保持不动、保持通过)

vite.config.ts                     # 修改：demo 用本地源 alias + aiModelConfig 按环境变量存在才配置
public/translate.json              # 不变（demo 存量缓存，保证 e2e 离线）
package.json                       # 版本 0.0.2 → 0.0.3
README.md / README.zh-CN.md / CHANGELOG.md / docs/requirements.md   # 文档更新
```

**Structure Decision**: 完全沿用现有单库结构（`src/autoi18n` + `tests` 四层 + `e2e`），新增文件放进既有 `translates/`（翻译源）与 `utils/`（纯函数）目录，不引入新的顶层目录。

## Complexity Tracking

> 无宪法违规，无需记录。
