# Feature Specification: 补齐开发基本要求（v0.0.2）

**Feature Branch**: `001-complete-dev-requirements`

**Created**: 2026-08-24

**Status**: Complete

**Input**: User description: "v0.0.2: 检查并补齐当前项目中缺少的'开发基本要求'内容——对照 docs/requirements.md 中的开发基本要求清单（测试体系：Vitest+Vue Test Utils 前端单元测试、pytest 后端测试、集成测试、Use Case 测试、Playwright e2e；commitlint+husky 提交规范；GitHub Actions CI 校验（main 分支 push/PR）；GitHub Issue 模板；中英双语 README（默认英文）；版本更新说明文件 CHANGELOG），逐项检查现状并补齐缺失项"

## User Scenarios & Testing *(mandatory)*

### User Story 1 - 完整的自动化测试体系 (Priority: P1)

作为本项目的开发者，我可以通过一条命令在本地运行项目的全部自动化测试（前端单元测试、集成测试、Use Case 测试、e2e 测试）并看到通过/失败结果，从而在修改自动国际化插件核心逻辑时有回归保障。

**Why this priority**: 测试是所有其他工程要求（TDD、CI 校验、循环 code review）的基础；没有测试体系，CI 与"先写测试再写代码"的要求都无法落地。当前项目测试数量为零，是最大的缺口。

**Independent Test**: 运行该命令后，对核心模块（自动国际化插件入口、翻译工具函数）的单元测试、插件与构建流程的集成测试、典型使用场景的 Use Case 测试、演示应用的 e2e 测试全部执行并可重复地全部通过。

**Acceptance Scenarios**:

1. **Given** 已安装依赖的项目, **When** 开发者运行全部测试命令, **Then** 单元测试、集成测试、Use Case 测试、e2e 测试被执行并输出汇总结果，且全部通过
2. **Given** 核心模块中某个被测函数的行为被故意改错, **When** 开发者运行单元测试, **Then** 对应测试失败并指出失败位置
3. **Given** 演示应用中自动国际化功能被破坏（如翻译内容未加载）, **When** 开发者运行 e2e 测试, **Then** e2e 测试失败

---

### User Story 2 - Git 提交规范强制 (Priority: P2)

作为本项目的贡献者，当我提交一条不符合约定式提交规范（Conventional Commits）的 commit message 时，本地提交会被拦截并提示具体原因；符合规范的提交正常通过，从而保证"一个功能点一个 commit"的可维护历史。

**Why this priority**: 提交规范是版本管理与回滚能力的直接保障，且是现有 git 历史风格的延续；不合规的提交信息会永久留在历史中，事后无法修正，因此需要提交时强制校验。

**Independent Test**: 在本地分别提交一条合规与一条不合规的 commit message，验证不合规的被拒绝、合规的成功创建。

**Acceptance Scenarios**:

1. **Given** 已安装依赖的项目, **When** 贡献者执行 `git commit -m "不符合规范的信息"`, **Then** 提交被拦截并输出可读的规则错误说明
2. **Given** 已安装依赖的项目, **When** 贡献者执行 `git commit -m "feat: xxx"` 格式的合规提交, **Then** 提交成功创建
3. **Given** 历史提交均采用 `feat:`/`fix:` 等前缀加中文描述的风格, **When** 启用提交规范校验, **Then** 现有风格不被破坏（规则与历史风格兼容）

---

### User Story 3 - CI 自动校验 (Priority: P2)

作为项目维护者，当有人向 main 分支 push 或创建指向 main 的 PR 时，GitHub Actions 自动运行类型检查与全部测试并报告结果，无需人工在本地逐项验证，从而保证 main 分支始终处于可发布状态。

**Why this priority**: CI 把"测试通过才算完成"的要求自动化到协作流程中，防止未经校验的代码进入 main 分支；与提交规范共同构成质量门禁。

**Independent Test**: 向 main 分支 push 或开启 PR 后，在 GitHub Actions 页面观察到校验工作流自动触发并完成。

**Acceptance Scenarios**:

1. **Given** 仓库已配置 CI, **When** 向 main 分支 push, **Then** 校验工作流自动触发并运行类型检查与测试
2. **Given** 仓库已配置 CI, **When** 创建指向 main 的 PR, **Then** PR 页面显示校验状态，且校验失败时 PR 被标记为未通过
3. **Given** CI 工作流运行, **When** 校验完成, **Then** 只执行校验（安装依赖、类型检查、测试），不执行任何发布或部署动作

---

### User Story 4 - 标准化 Issue 提交 (Priority: P3)

作为报告 bug 或提出功能建议的社区用户，我在新建 Issue 时可以从模板（Bug 报告、功能建议）中选择并按结构填写，从而让维护者获得可复现、可评估的信息。

**Why this priority**: Issue 模板提升协作输入质量，但对代码质量没有直接影响，属于工程协作的补强项，优先级最低。

**Independent Test**: 在仓库新建 Issue 页面出现"Bug 报告"与"功能建议"两个模板入口，选择后自动带出结构化表单。

**Acceptance Scenarios**:

1. **Given** 仓库已提供 Issue 模板, **When** 用户新建 Issue, **Then** 可选择 Bug 报告或功能建议模板
2. **Given** 用户选择 Bug 报告模板, **When** 模板加载, **Then** 表单包含问题描述、复现步骤、期望/实际行为、环境信息等字段

---

### User Story 5 - 双语文档与版本更新说明 (Priority: P2)

作为首次访问仓库的用户，我默认看到英文 README，并可一键切换到中文版；作为使用者，我可以查阅版本更新说明文件了解每个版本（含 v0.0.1、v0.0.2）的变更内容。

**Why this priority**: README 是项目的门面（默认英文是明确的对外要求），版本更新说明是每个版本交付的必备产物，两者共同保证项目的可发现性与可追溯性。

**Independent Test**: 打开仓库首页默认渲染英文 README，通过链接可进入中文版；CHANGELOG 文件包含截至 v0.0.2 的版本记录。

**Acceptance Scenarios**:

1. **Given** 仓库首页, **When** 用户打开, **Then** 默认显示英文自述文档，且提供指向中文版的链接（中文版同样提供返回英文版的链接）
2. **Given** 版本更新说明文件, **When** 用户查阅, **Then** 可以看到 v0.0.1 与 v0.0.2 的变更记录，v0.0.2 记录包含本次补齐的全部工程能力
3. **Given** README（中/英）, **When** 用户阅读安装与使用章节, **Then** 内容与项目现状一致（安装方式、插件接入示例）

### Edge Cases

- 开发环境为 Windows + Git Bash + pnpm，测试命令与钩子脚本必须在该环境可用；CI 运行在 GitHub 托管的 Linux runner 上，同一套命令需跨两种环境工作
- e2e 测试需要先启动演示应用的开发服务器，必须保证服务器就绪后再执行测试、结束后清理进程
- 现有构建脚本使用了 `cp`/`rm` 等 Unix 命令，属于历史现状，本次补齐不改变现有构建行为，只新增能力
- 项目无 Python 业务代码（`.specify/scripts/` 下的 Python 仅为 SpecKit 工具脚本），后端 pytest 测试的适用范围需要明确边界（见 Assumptions）
- 单元测试中涉及大模型翻译调用的部分不能真实调用外部 API（不稳定且有费用），必须可以离线运行

## Requirements *(mandatory)*

### Functional Requirements

- **FR-001**: 项目 MUST 提供前端单元测试能力（Vitest + Vue Test Utils），并至少覆盖自动国际化插件的核心模块（插件入口配置处理、翻译内容读写工具函数）
- **FR-002**: 项目 MUST 提供集成测试，验证 Vite 插件与构建/开发流程的集成行为（插件在 Vite 构建中被加载并对代码产生预期转换）
- **FR-003**: 项目 MUST 提供 Use Case 测试，覆盖典型使用场景（接入插件 → 开发阶段触发翻译采集 → 读取/保存翻译内容）
- **FR-004**: 项目 MUST 提供 e2e 测试（Playwright），对演示应用验证自动国际化功能端到端可用（页面渲染、翻译内容加载）
- **FR-005**: 项目 MUST 提供单条命令运行全部测试，并提供分类运行命令（仅单元/仅 e2e 等）
- **FR-006**: 单元/集成/Use Case 测试 MUST 可离线运行，不得在测试中真实调用大模型翻译 API
- **FR-007**: 项目 MUST 配置 commitlint（约定式提交规则，与历史提交风格兼容）并通过 husky 的 commit-msg 钩子在不合规时拒绝提交
- **FR-008**: 项目 MUST 提供 GitHub Actions CI 工作流：在 main 分支 push 和指向 main 的 PR 上自动运行依赖安装、类型检查、全部测试；仅做校验，不做发布/部署
- **FR-009**: 类型检查 MUST 作为独立命令存在并纳入 CI（保证 TypeScript 类型安全的要求可被机器校验）
- **FR-010**: 仓库 MUST 提供 GitHub Issue 模板，至少包含 Bug 报告与功能建议两类
- **FR-011**: README.md MUST 默认为英文，同时提供中文版（如 README.zh-CN.md），两者内容对应并互相链接
- **FR-012**: 项目 MUST 提供版本更新说明文件（CHANGELOG.md），包含 v0.0.1（依 git 历史补录）与 v0.0.2 的变更记录

### Key Entities

（本特性为工程基础设施补齐，不引入新的业务数据实体。）

## Success Criteria *(mandatory)*

### Measurable Outcomes

- **SC-001**: 在全新克隆并安装依赖的仓库中，单条测试命令可完成全部测试（单元/集成/Use Case/e2e）且全部通过
- **SC-002**: 不符合提交规范的 commit message 100% 在本地被拦截，且错误信息能指出违反的具体规则
- **SC-003**: main 分支 push 或指向 main 的 PR 100% 触发 CI 校验，工作流包含类型检查与全部测试
- **SC-004**: 新用户可在 1 分钟内通过 Issue 模板创建包含必备字段的 Bug 报告或功能建议
- **SC-005**: 仓库首页默认展示英文 README，1 次点击可达中文版；CHANGELOG 覆盖截至当前的全部已发布版本

## Assumptions

- 项目当前没有 Python 业务代码（`.specify/scripts/` 的 Python 为 SpecKit 自带工具脚本，纯标准库），因此 v0.0.2 不搭建 pytest 测试；待后续引入 Python 代码时再按需求补齐 pytest 单元测试
- CI 仅做校验（安装依赖、类型检查、测试），不做自动发布/部署（遵循"先只做校验"的要求）
- e2e 以仓库内现有演示应用（Vite dev 模式页面）为被测对象，测试内自动启动/关闭开发服务器
- 大模型 API Key 只存在于本地 `.env.local`，任何测试与 CI 均不依赖真实 API Key（离线可运行）
- v0.0.1 的 CHANGELOG 条目依据 git 历史补录，粒度到功能组而非逐 commit
- commitlint 采用与现有历史风格（`feat:`/`fix:` 前缀 + 中文描述）兼容的规则集
- 本次只新增工程能力，不改变现有构建产物与发布流程（`plugin:build` 等脚本保持原样）
