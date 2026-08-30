# Implementation Plan: 清理智谱特殊化配置（v0.0.4）

**Branch**: `003-remove-zhipuai-preset` | **Date**: 2026-08-29 | **Spec**: [spec.md](./spec.md)

**Input**: Feature specification from `/specs/003-remove-zhipuai-preset/spec.md`

## Summary

v0.0.4 是一次**公开契约的破坏性清理**：移除智谱作为独立 LLM 模式的全部特殊化入口——`TranslateAIModel.ZHIPUAI` 枚举成员、`translates/zhipuai.ts` 预设模块、`provider.ts` 的 ZHIPUAI 调度分支、入口导出 `zhipuaiTranslate`（含 `DEFAULT_ZHIPUAI_MODEL`）——LLM 配置收敛为唯一形态 `TranslateAIModel.OPENAI`。智谱自此只是 `AIModelConfig` 的一组参数取值（`baseUrl: https://open.bigmodel.cn/api/paas/v4` + `model: glm-4`），因 v0.0.3 起两种模式共用 `shared.ts` 的同一 Chat Completions 客户端，**请求体与译文行为逐字段等价，迁移零行为差异**。旧值 `'zhipuai'` 运行时落入既有无效配置路径（一次性警告 + 回退免费翻译，构建不中断），新增单测固化。同步更新双语 README（含智谱迁移示例）、CHANGELOG（破坏性变更条目）、CLAUDE.md 架构描述与演示应用构建配置，`package.json` 与 `AUTOI18N_PLUGIN_VERSION` 同步升至 0.0.4。

## Technical Context

**Language/Version**: TypeScript 5.1（沿用现有 tsconfig，`strict: false` 不变），Node ≥ 18，pnpm 10.17.1

**Primary Dependencies**: 现有依赖零变化——Vue 3.3.4（锁定）、Vite 4.3.9（锁定）、crypto-js（MD5 键）、lodash（merge）；本版本为纯删除，**零新增、零升级**

**Storage**: 翻译缓存 JSON（`public/translate.json`，键 `autoi18n_<md5>`）**结构不变且继续命中**——键为内容哈希、与翻译源无关

**Testing**: Vitest 1.6（单元/集成/Use Case，node 环境 + stub `fetch`）+ Playwright（e2e，demo 存量缓存命中、离线）

**Target Platform**: 构建期 Vite 插件（Node）+ 运行时 Vue 插件（浏览器，本版本不动）

**Project Type**: library（`auto-i18n-vue`）+ 内嵌演示 web 应用

**Performance Goals**: 不涉及（纯清理，无新增运行时路径；代码量净减少）

**Constraints**: 测试 100% 离线（不调收费 API）；Vue/Vite 版本锁死；`TranslateTarget` 枚举值与缓存键格式不可变；`AUTOI18N_PLUGIN_VERSION` 与 `package.json` 版本必须同步（tsconfig `rootDir` 边界导致不能 import package.json，CLAUDE.md 已标注）；一功能点一 commit；TDD；0.0.x 阶段破坏性变更可接受（需求已确认）

**Scale/Scope**: 删除源码 1 个文件（`zhipuai.ts`，63 行）+ 4 个源文件的智谱引用点；测试删 1 个文件（`translates-zhipuai.spec.ts`）、改 2 个文件（provider/index-exports spec）；文档改 4 个文件（双语 README、CHANGELOG、CLAUDE.md）+ `docs/requirements.md` 已在需求分析阶段更新；配置改 `vite.config.ts`、`package.json`、`autoi18nPlugin.ts` 版本常量。预计净变更约 -200/+150 行

## Constitution Check

*GATE: Must pass before Phase 0 research. Re-check after Phase 1 design.*

`.specify/memory/constitution.md` 仍为未定制模板（与 specs/002 处理一致）。以 docs/requirements.md 的硬性开发要求为事实治理原则：

| 原则（来自需求） | 本设计是否合规 |
| --- | --- |
| 测试驱动（先测试后代码） | 合规——先改测试表达新契约（导出面不含智谱、旧值降级），确认失败后再删实现 |
| 完整测试（单元/集成/UseCase/e2e） | 合规——单测覆盖降级与导出面；集成/UseCase/e2e 既有用例保持通过（不依赖智谱路径） |
| 一功能点一 commit | 合规——按"库清理 / 测试固化 / 演示配置 / 版本与文档"分组提交 |
| 循环 code review 至无中等问题 | 合规——tasks.md 收尾任务 |
| 测试只用假数据，不调收费 API | 合规——智谱为收费接口，全部 stub `fetch` 断言请求构造 |
| TypeScript 类型安全 | 合规——枚举成员删除后 `type-check` 必须通过（旧引用即编译错误，正是迁移点显性化） |
| pnpm 管理包 | 合规——零依赖变化 |
| 每版本需求完成后循环 code review | 合规——见 tasks.md 收尾 |

Phase 1 设计后复查：无违规，无需 Complexity Tracking 记录。

## Project Structure

### Documentation (this feature)

```text
specs/003-remove-zhipuai-preset/
├── plan.md              # 本文件
├── research.md          # Phase 0：删除范围/降级路径/迁移等价性等 7 项决策
├── data-model.md        # Phase 1：实体收敛（TranslateAIModel/AIModelConfig）与不变量
├── quickstart.md        # Phase 1：验证指南（离线测试 + 迁移配置验证）
├── contracts/
│   └── translation-providers.md   # 清理后的公开契约（v0.0.4 状态）
├── checklists/
│   └── requirements.md  # specify 阶段质量清单（已通过）
└── tasks.md             # Phase 2（$speckit-tasks 生成）
```

### Source Code (repository root)

```text
src/autoi18n/
├── @types/
│   ├── enum.ts                    # 修改：TranslateAIModel 删除 ZHIPUAI 成员（仅剩 OPENAI）
│   └── autoi18nPlugin.d.ts        # 修改：AIModelConfig.model 注释去除 ZHIPUAI 缺省描述
├── translates/
│   ├── zhipuai.ts                 # 删除：智谱预设模块整体移除
│   ├── provider.ts                # 修改：删除 ZHIPUAI 调度分支；警告文案去除 ZHIPUAI 特判拼接
│   ├── shared.ts                  # 修改：文件头注释去除智谱字样（实现不变）
│   └── index.ts                   # 修改：删除 export * from './zhipuai'
├── index.ts                       # 修改：公开导出移除 zhipuaiTranslate（导入与导出两处）
└── autoi18nPlugin.ts              # 修改：AUTOI18N_PLUGIN_VERSION '0.0.3' → '0.0.4'

tests/
├── unit/
│   ├── translates-zhipuai.spec.ts # 删除：智谱专项单测（覆盖点并入 provider/openai 用例语义）
│   ├── translates-provider.spec.ts# 修改：删除 ZHIPUAI 分支用例；新增旧值 'zhipuai' 降级用例
│   └── index-exports.spec.ts      # 修改：导出清单去 zhipuaiTranslate；枚举全成员仅 OPENAI
└── (integration / usecase / e2e 既有用例不动、保持通过)

vite.config.ts                     # 修改：删除 ZHIPUAI_API_KEY 环境变量分支，统一 OPENAI_* 变量
package.json                       # 版本 0.0.3 → 0.0.4
README.md / README.zh-CN.md / CHANGELOG.md / CLAUDE.md   # 文档更新（智谱迁移示例 + 破坏性变更条目）
public/translate.json              # 不变（存量缓存与源无关，继续命中）
```

**Structure Decision**: 完全沿用现有单库结构，无新增文件与目录；本版本为纯删除/收缩，`translates/` 目录保留 openai/free/provider/shared 四个模块。

## Complexity Tracking

> 无宪法违规，无需记录。
