# Research: 清理智谱特殊化配置（v0.0.4）

**Date**: 2026-08-29 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

本特性无外部技术未知量（目标代码即本仓库，行为等价性依据已在 v0.0.3 固化）；research 记录清理决策与依据，全部决策已在需求分析阶段（2026-08-29）获使用者确认。

## R1: 删除范围与方式

**Decision**: 硬删除全部智谱特殊化入口，无 deprecation 过渡：`TranslateAIModel.ZHIPUAI` 枚举成员、`translates/zhipuai.ts` 整个模块（含 `zhipuaiTranslate`、`DEFAULT_ZHIPUAI_MODEL`、智谱 baseUrl 常量）、`translates/index.ts` 的 re-export、库入口 `index.ts` 的 `zhipuaiTranslate` 导入与导出、`provider.ts` 的 ZHIPUAI 调度分支及其在无效配置警告文案中的特判拼接、`AIModelConfig.model` 类型注释中的 ZHIPUAI 缺省说明、`shared.ts` 文件头注释中的智谱字样。

**Rationale**: 需求原文"不需要为了向后兼容特殊化智谱"明示硬删除；项目处于 0.0.x 验证阶段，公开契约尚未稳定，保留 deprecation 分支即保留特殊化本身，与需求相悖。TS 侧旧引用随枚举成员删除产生编译错误，恰是显式迁移点；JS/普通对象侧旧字符串落入无效配置降级路径（见 R2），失败方向安全。

**Alternatives considered**:
- 保留 `ZHIPUAI = 'zhipuai'` 并标记 `@deprecated`，内部转发 OPENAI 逻辑：保留即特殊化，且枚举成员的 baseUrl/model 预设仍需维护 → 与需求直接冲突，否决
- 仅删导出保留模块：半清理状态无消费者，纯死代码 → 否决

## R2: 旧值 `'zhipuai'` 的运行时降级路径

**Decision**: 不新增任何降级代码——`provider.ts` 既有的无效配置分支（`model` 非已知枚举 → 一次性警告 + 返回免费翻译源）天然覆盖旧值 `'zhipuai'`。仅新增单测固化该行为（以 `'zhipuai'` 为输入断言：回退免费源、警告仅一次、构建不中断），并把警告文案中 OPENAI 特判的 model 状态拼接逻辑简化为通用形式。

**Rationale**: specs/002 R5 已确立"配置无效 → 警告 + 回退免费而非抛错"的容错定位；本次删除后 `'zhipuai'` 与 `'unknown-model'` 走同一路径，无需分支。测试纪律：全部 stub，不真实调用智谱收费接口。

**Alternatives considered**:
- 为旧值单独输出"请迁移"专用警告文案：需要在 provider 里再维护一个智谱专属字符串，违背"去特殊化"目标；通用无效配置警告已含 model 取值与回退去向，README/CHANGELOG 承载迁移指引 → 否决

## R3: 智谱迁移等价性依据

**Decision**: README 迁移示例直接给出参数映射：`model: TranslateAIModel.OPENAI` + `config: { apiKey, baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' }`。

**Rationale**: v0.0.3 重构后（specs/002 R2），智谱直连即"通用 Chat Completions 客户端 + 预设参数"的委托结构：`zhipuaiTranslate` 内部调用 `chatCompletionsTranslate({ apiKey, baseUrl: 'https://open.bigmodel.cn/api/paas/v4', model: 'glm-4' })`。迁移后的 OPENAI 配置产生**完全相同**的请求（同一 URL 拼接、同一 `Bearer` 头、同一请求体字段、同一 few-shot 批量提示词协议），译文写入同一缓存结构。因此等价性由构造保证，并在 `translates-provider.spec.ts` 以"OPENAI 模式 + 智谱参数"用例固化：stub `fetch` 断言请求 URL（`https://open.bigmodel.cn/api/paas/v4/chat/completions`）、`Bearer` 头与请求体 `model: 'glm-4'`，即把被删除智谱专项用例的断言语义移植到统一模式的参数取值上（speckit-analyze C1 补强）。

## R4: 测试更新策略

**Decision**: 删除 `tests/unit/translates-zhipuai.spec.ts`（3 个用例：默认模型 glm-4、自定义模型透传、空模型回退——"model 参数透传"语义在 `translates-openai.spec.ts`/`translates-provider.spec.ts` 的 OPENAI 用例中已有等价覆盖，"智谱端点等价"断言移植入 provider spec 的智谱参数用例，见 R3）；`translates-provider.spec.ts` 删除"model=ZHIPUAI 且 apiKey 齐备"用例，新增"旧值 'zhipuai' 回退免费源（警告一次）"与"OPENAI 模式 + 智谱参数请求构造等价"两个用例；`index-exports.spec.ts` 导出清单移除 `zhipuaiTranslate`、枚举全成员断言改为仅 `OPENAI`。集成/UseCase/e2e 不动（均不依赖智谱路径；demo 存量缓存命中，e2e 保持离线）。

**Rationale**: TDD 顺序上先改测试表达新契约（删除智谱专项 + 新增降级用例），此时 type-check/测试失败，再执行实现删除使其转绿。既有 OPENAI 用例已断言 `baseUrl` 透传与 `model` 透传（DeepSeek 场景），智谱参数只是同一断言的不同取值，不需要为收费服务商保留专属用例。

## R5: 演示应用与本地环境处理

**Decision**: `vite.config.ts` 删除 `ZHIPUAI_API_KEY` 环境变量分支，翻译源条件配置仅剩 `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL` → 免费默认。本地 `.env.local` 中的 `ZHIPUAI_API_KEY` 由使用者自行迁移（`OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`、`OPENAI_MODEL=glm-4`），不纳入代码变更。

**Rationale**: 演示配置中的智谱分支正是"相关特殊配置"的一部分；`.env.local` 不入库，代码侧清理后该变量自然失效（未配置 LLM → 免费兜底，行为回退非报错，符合 FR-004 的失败方向）。README 迁移示例即演示应用的迁移操作说明。

## R6: 文档更新清单

**Decision**: 双语 README——翻译源清单删除 ZHIPUAI 条目、vite 配置示例删 `ZHIPUAI_API_KEY` 分支、新增智谱迁移配置示例（英文版同步）；CHANGELOG——v0.0.4 条目标注 BREAKING（枚举成员与 `zhipuaiTranslate` 导出移除）并给迁移路径；CLAUDE.md——"Translation source resolution"段的 `translates/zhipuai.ts` 表述改写为三模块（openai/free/provider+shared）。specs/002 全部产物保留为历史快照不回改（已确认）。

**Rationale**: 需求明示"完成之后也需要更新文档"；`docs/requirements.md` 的 v0.0.4 补充说明已在需求分析阶段写入。

## R7: 版本同步

**Decision**: `package.json` `version` 与 `autoi18nPlugin.ts` 的 `AUTOI18N_PLUGIN_VERSION` 同步 `'0.0.3'` → `'0.0.4'`（后者当前位于 `autoi18nPlugin.ts:20`）。

**Rationale**: CLAUDE.md 标注的版本漂移陷阱——`ts:build` 的 `rootDir: src/autoi18n` 禁止跨边界 import `package.json`，两处必须手工同步；发布物（`buildJs/`/`buildTypes/`）为 gitignored 构建产物，实现后需重新生成验证 `pnpm plugin:build` 可通过。
