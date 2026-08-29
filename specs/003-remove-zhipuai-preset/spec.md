# Feature Specification: 清理智谱特殊化配置（v0.0.4）

**Feature Branch**: `003-remove-zhipuai-preset`

**Created**: 2026-08-29

**Status**: Draft

**Input**: User description: "v0.0.4：不需要为了向后兼容特殊化智谱，请清理相关特殊配置，完成之后也需要更新文档"（完整需求分析与决策见 `docs/requirements.md` v0.0.4 小节）

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 智谱用户迁移到统一 LLM 配置 (Priority: P1)

作为正在使用智谱 GLM 直连配置（`TranslateAIModel.ZHIPUAI` + apiKey）的接入方开发者，我升级到 v0.0.4 后，按照 README 迁移说明改用统一的 LLM 配置（`TranslateAIModel.OPENAI` + 智谱服务地址 + `glm-4` 模型名），翻译行为与升级前完全一致，存量翻译缓存继续命中。

**Why this priority**: 本版本的核心价值就是"智谱不再特殊"——把智谱收敛为统一 LLM 配置的一组参数取值是需求本体；迁移路径清晰且行为零差异是这次破坏性清理能安全落地的前提。

**Independent Test**: 在插件配置中以 OPENAI 模式指定智谱服务地址与 `glm-4` 运行开发构建，翻译请求发往智谱端点、请求体与原直连模式一致、译文写入缓存；自动化测试以 stub 网络请求验证请求构造，不真实调用收费接口。

**Acceptance Scenarios**:

1. **Given** 接入方按迁移说明以 OPENAI 模式配置（智谱服务地址、`glm-4`、智谱 apiKey）, **When** 开发构建执行, **Then** 翻译请求发往智谱端点且请求体与原 ZHIPUAI 模式逐字段一致，译文正常写入翻译缓存
2. **Given** 升级前已存在的翻译缓存文件, **When** 升级后首次构建, **Then** 缓存键与翻译源无关，全部既有译文继续命中，不重复翻译
3. **Given** TypeScript 接入方仍使用 `TranslateAIModel.ZHIPUAI`, **When** 执行类型检查/构建, **Then** 编译期报错提示该成员不存在（迁移点显式，配合文档迁移说明）

---

### User Story 2 - 旧配置的优雅降级 (Priority: P2)

作为以普通对象/字符串形式传入旧配置值 `zhipuai` 的接入方开发者（无编译期保护的场景），升级后我的构建不会失败：插件输出一次包含迁移指引的警告，并自动回退到免费三方翻译兜底。

**Why this priority**: 降级行为保证破坏性变更的失败方向安全（不中断构建、仍有可用翻译），是库对存量使用者的义务；但它只服务于未及时迁移的用户，优先级低于迁移主路径。

**Independent Test**: 以字符串 `'zhipuai'` 作为模型配置传入插件，构建含待翻译文案的模块：断言警告输出且翻译回退到免费源（自动化测试 stub 网络验证）。

**Acceptance Scenarios**:

1. **Given** 模型配置的取值为旧值 `'zhipuai'`, **When** 开发构建执行, **Then** 插件输出一次性无效配置警告（含 apiKey/model 状态与回退去向），回退免费三方翻译，构建不中断
2. **Given** 同一次构建中多个模块先后触发翻译源解析, **When** 无效配置已警告过一次, **Then** 后续模块不再重复打印该警告

---

### User Story 3 - 文档与版本同步更新 (Priority: P3)

作为评估与维护本库的使用者和贡献者，升级后我能在双语 README 中看到不含智谱条目的翻译源说明与智谱迁移配置示例，在 CHANGELOG 中看到 v0.0.4 破坏性变更条目与迁移路径，库的包版本与插件内置版本一致地升至 0.0.4。

**Why this priority**: 需求明确要求"完成之后也需要更新文档"；文档与版本同步是变更可被发现、可被追溯的保障，但属于交付物完整性而非运行时能力，优先级最低。

**Independent Test**: 人工核对 README（中英）翻译源清单与配置示例、CHANGELOG v0.0.4 条目、CLAUDE.md 架构描述；核对包版本与插件内置版本均为 0.0.4。

**Acceptance Scenarios**:

1. **Given** v0.0.4 完成, **When** 使用者阅读双语 README, **Then** 翻译源清单为自定义/LLM/免费三种且 LLM 仅剩 OPENAI 一种配置形态，并附智谱迁移配置示例（服务地址 + 模型名）
2. **Given** 使用者查看 CHANGELOG, **When** 阅读 v0.0.4 条目, **Then** 其中标注破坏性变更（枚举成员与公开导出移除）并给出迁移路径
3. **Given** 演示应用仓库, **When** 查看其构建配置, **Then** 不再存在智谱专用环境变量分支，统一使用通用 LLM 环境变量（API Key/服务地址/模型名）

### Edge Cases

- 旧配置值 `'zhipuai'` 传入（无编译期保护的场景）：警告一次 + 回退免费翻译，不得中断构建
- 直接导入 `zhipuaiTranslate` 的接入方：升级后模块解析失败（预期内破坏），CHANGELOG 迁移说明必须覆盖该场景
- 存量翻译缓存：键为源文案哈希、与翻译源无关，升级后必须继续命中
- 演示应用本地环境变量未迁移：回落免费翻译（行为回退），不得报错
- 智谱经统一 LLM 模式接入：端点、模型默认值、鉴权、批量提示词协议必须与原直连模式完全一致，不得引入行为差异
- 免费三方翻译兜底能力不受本次清理影响，保持 v0.0.3 行为（MyMemory 主 + Google 免费备）

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: LLM 翻译配置 MUST 收敛为唯一形态——`TranslateAIModel` 枚举仅保留 `OPENAI`（OpenAI Chat Completions 兼容）成员，`ZHIPUAI` 成员 MUST 移除
- **FR-002**: 库的公开导出面 MUST NOT 再包含智谱专属入口（`zhipuaiTranslate` 及智谱默认模型常量），其余公开导出保持不变
- **FR-003**: 智谱 GLM 服务 MUST 可经统一 LLM 配置接入（服务地址 `https://open.bigmodel.cn/api/paas/v4` + 模型 `glm-4`），翻译请求与译文行为 MUST 与移除前的直连模式完全一致
- **FR-004**: 传入已移除的旧配置值（如 `'zhipuai'`）时，插件 MUST 输出一次性警告并回退免费三方翻译，MUST NOT 中断构建
- **FR-005**: 翻译缓存 MUST 与翻译源保持解耦：升级后存量缓存全部继续命中，不触发重复翻译
- **FR-006**: 面向使用者的文档 MUST 同步更新——双语 README（翻译源清单、配置示例、智谱迁移示例）、CHANGELOG（v0.0.4 破坏性变更与迁移路径）、CLAUDE.md（架构描述）
- **FR-007**: 版本标识 MUST 同步升至 0.0.4（包版本与插件内置版本常量，两处一致）
- **FR-008**: 测试 MUST 全部离线运行（stub 网络请求）：移除智谱专项单测、新增旧值降级路径单测、公开导出与调度器既有用例同步更新；全量测试与类型检查通过
- **FR-009**: 演示应用构建配置 MUST 移除智谱专用环境变量分支，统一使用通用 LLM 环境变量（API Key/服务地址/模型名）

### Key Entities

- **翻译源枚举（TranslateAIModel）**: 接入方声明 LLM 翻译模式的公开枚举；本次收敛为仅 `OPENAI` 一种，智谱不再是独立模式
- **公开导出面（Public Exports）**: 库入口导出的运行时函数与类型集合，是接入方的编译期与链接期依赖；本次移除其中智谱专属成员
- **LLM 配置（AIModelConfig）**: API Key + 可选服务地址与模型名；智谱自此只是该配置的一组参数取值（特定服务地址 + `glm-4`），而非独立配置形态
- **翻译缓存（Translate Cache）**: 以源文案哈希为键的持久化译文文件，与翻译源解耦；本次变更不影响其结构与命中行为

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 按迁移说明配置的智谱用户在升级后首次构建即恢复翻译能力，翻译请求与升级前逐字段一致，存量缓存 100% 继续命中
- **SC-002**: 公开 API 面（枚举成员、入口导出、翻译源调度分支）中不存在任何智谱专属入口，以导出清单测试固化
- **SC-003**: 旧值 `'zhipuai'` 的"警告一次 + 回退免费翻译"降级行为有自动化测试固化，构建全程不中断
- **SC-004**: 全量测试（单元/集成/Use Case）与类型检查通过；除智谱专项用例外，既有用例零回退
- **SC-005**: 双语 README、CHANGELOG、CLAUDE.md 更新完毕，包版本与插件内置版本一致为 0.0.4

## Assumptions

- 硬删除、无 deprecation 过渡——需求原文明示"不需要为了向后兼容特殊化智谱"（2026-08-29 需求分析已确认）
- 项目处于 0.0.x 验证阶段，破坏性变更在 0.0.4 发布可接受，沿用既有版本命名惯例（不做 semver-major 跳版）
- "智谱经统一模式行为无差异"的技术依据：v0.0.3 重构后智谱直连与 OPENAI 模式共用同一 OpenAI 兼容客户端（specs/002 记录），本次仅移除预设包装
- 演示应用的 `.env.local` 为不入库的本地文件，由使用者按迁移说明自行调整，不纳入本次交付物
- specs/002 作为历史快照保留、不回改（2026-08-29 已确认），本次变更由本 spec 与 CHANGELOG 承载
- 本版本为纯清理：不新增翻译能力，不调整翻译源优先级（自定义 > LLM > 免费）与免费源行为
