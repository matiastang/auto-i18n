# 需求

Vite 自动实现UI上的i18n的适配，自动完成国际化的是配置

## 说明

- 项目所有原始需求在 docs/requirements.md 文件中
- 使用 SpecKit 分析需求，并生成 SpecKit 文件
- 前端使用 **Vue + TypeScript + Vite** 实现。

## 开发基本要求

- 项目使用 git 来管理版本
- python使用uv来管理、使用pnpm来管理前端包
- 项目需要实现完整的测试，包括：单元测试（后端用 pytest、前端用 Vitest + Vue Test Utils）、集成测试、Use Case 测试、e2e 测试（用 Playwright）。
- 要实现 git commit 规范，包括 commitlint 和 husky。
- 项目需要实现 CI/CD，包括 GitHub Actions。先只做校验，不做自动部署，后面再考虑。
- 前端使用 TypeScript，并且需要使用 TypeScript 的类型系统来保证代码的类型安全。
- 项目 main 分支的 push、 PR 需要跑 CI 测试
- 需要先写测试，再写代码，测试驱动开发，开发完成后，测试通过，代码完成
- 每个版本的需求完成后，都需要做完整的**循环 code review 并修复中等严重及以上问题，直到没有中等严重问题**
- **重要** 每一个功能点一个 commit，不要把多个功能点放在一个 commit 中，这样不利于代码的维护和回滚
- 项目需要提供 GitHub Issue 模板，规范 issue 提交（如 Bug 报告、功能建议）
- 每个版本需要实现的功能，有不确定的可以问我。并且将我的回答或补充信息放到对应的版本（如：v0.0.1）信息的最后面。
- README.md文件需要有中文和英文版本，默认显示英文自述文档
- 需要有版本更新说明文件

## v0.0.2

请检查并补齐当前项目中，缺少的“开发基本要求”内容

## v0.0.3

实现基本功能，其他Vue+Vite的前端项目接入之后，能快速实现i18n的支持，现在主要为验证阶段，能跑通流程就行。
1. 需要支持配置LLM的apikey来实现翻译功能，能支持常见的LLM接口。
2. 定义可以接口格式，用户可以提供一个实现了格式的接口，来完成翻译功能。
3. 也可以使用一些免费的三方提供的翻译能力来实现翻译功能（比如谷歌翻译、微软翻译等）。并且这应该是没有配置前面两种情况下的默认行为。

**注意** 测试的时候你自己使用假数据或使用三方来免费测试，不要调用任何收费接口或API来测试。

**实现补充说明（v0.0.3，2026-08-24）**

按"中间不要问我任何内容，你自己决定"的授权，以下决策已固化（详见 `specs/002-translation-providers/research.md`）：

- **免费三方翻译选型**：实测（2026-08-24，中国大陆网络）Google 免费接口连接超时（被墙）、微软 Edge 免费接口已 404 下线、MyMemory 免费 API 可达且返回干净 JSON、`{name}` 占位符原样保留。因此默认免费源采用 **MyMemory 为主、Google 免费接口（gtx）为备** 的逐条回退链；免费接口属非官方约定，验证阶段可接受，后续版本可替换为更稳定方案（如自托管 LibreTranslate）。
- **"常见 LLM 接口"标准**：以 OpenAI Chat Completions 兼容格式为准（OpenAI/DeepSeek/Moonshot/通义兼容模式/Ollama 等均兼容），配置 `apiKey` + `baseUrl` + `model`；智谱 GLM 直连方式保留且行为不变。
- **翻译源优先级**：自定义 `translate` 函数 > LLM（`aiModelConfig`）> 免费三方翻译（默认）。LLM 配置无效（缺 apiKey/model 或未知模型）时警告并回退免费源，不中断构建。
- **测试纪律**：全部自动化测试离线运行（stub 网络请求，假数据形状来自真实免费接口探测），未调用任何收费 API；对免费接口的真实验证仅做了一次（演示应用 17 条文案经 MyMemory 翻译并落盘），未纳入 CI。
- **语言代码映射**：内部枚举历史命名（`jp`/`ara`/`fra`）不可变更（存量缓存兼容），新增 `toIsoLocale` 显式映射到三方 ISO 代码（`ja`/`ar`/`fr`，中文 `zh-CN`）。

## v0.0.4

* 不需要为了向后兼容特殊化**智谱**，请清理相关特殊配置，完成之后也需要更新文档

**实现补充说明（v0.0.4，2026-08-29）**

- **删除方式**：硬删除，不做 deprecation 过渡——`TranslateAIModel.ZHIPUAI` 枚举成员、`translates/zhipuai.ts` 模块、`provider.ts` 的 ZHIPUAI 分支、公开导出 `zhipuaiTranslate` 全部移除；智谱用户迁移到 `TranslateAIModel.OPENAI` 模式（`baseUrl: https://open.bigmodel.cn/api/paas/v4` + `model: glm-4`，底层与原 ZHIPUAI 模式共用同一 `chatCompletionsTranslate` 客户端，请求体一致，翻译行为无差异）。
- **兼容行为固化**：TS 用户旧配置编译期报错（迁移点显式）；JS 用户旧字符串 `'zhipuai'` 落入无效配置路径——警告一次并回退免费翻译，需新增 provider 测试固化该降级行为。翻译缓存 JSON 不受影响（键为内容 MD5 哈希，与翻译源无关）。
- **演示应用**：`vite.config.ts` 删除 `ZHIPUAI_API_KEY` 环境变量分支，统一走 `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`；本地 `.env.local` 需同步迁移（智谱：`OPENAI_BASE_URL=https://open.bigmodel.cn/api/paas/v4`、`OPENAI_MODEL=glm-4`），未迁移时回落免费翻译（行为回退，非报错）。
- **测试纪律**：延续 v0.0.3 约定——全部离线 stub `fetch`，仅断言 URL/model 组装，不调用任何收费接口或 API。
- **版本同步**：`package.json` 与 `AUTOI18N_PLUGIN_VERSION` 同步升至 0.0.4（版本漂移陷阱，见 CLAUDE.md）。
- **开发流程（2026-08-29 问答决策）**：走 SpecKit 完整流程，新建 specs/003（spec → plan → tasks）；specs/002 保留为历史快照不回改，本次变更由 specs/003 与 CHANGELOG 承载。
