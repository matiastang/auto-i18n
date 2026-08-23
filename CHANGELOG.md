# 更新日志 / Changelog

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

## [0.0.3] - 2026-08-24

实现核心翻译能力：三级翻译源体系，其他 Vue + Vite 项目接入后可快速获得 i18n 支持（验证阶段，规格产物见 `specs/002-translation-providers/`）。全部自动化测试离线运行（stub 网络），未调用任何收费 API；免费三方接口做过一次性真实验证（17 条文案经 MyMemory 翻译落盘）。

### Added

- 免费三方翻译（默认翻译源）：未配置任何翻译源时零配置自动启用，服务链 MyMemory（主）→ Google 免费接口（备）逐条回退；单条失败仅警告并跳过，不中断构建
- OpenAI 兼容 LLM 翻译源：支持任一 OpenAI Chat Completions 兼容服务（OpenAI、DeepSeek、Moonshot/Kimi、通义千问兼容模式、本地 Ollama 等），配置 `apiKey` + `baseUrl` + `model` 即可
- 语言代码映射工具 `toIsoLocale`：内部语言枚举 → 三方服务 ISO 代码（`zh→zh-CN`、`jp→ja`、`ara→ar`、`fra→fr`），未知语言跳过并警告
- 翻译源统一调度 `resolveTranslateFunction`：固定优先级 `translate`（自定义）> `aiModelConfig`（LLM）> 免费三方翻译（默认）；LLM 配置无效时警告并回退免费源
- 入口公开导出翻译契约：`TranslateFunction`、`AIModelConfig` 等类型与 `freeTranslate` / `openaiTranslate` / `zhipuaiTranslate` / `resolveTranslateFunction` / `toIsoLocale` 运行时导出

### Changed

- 智谱 GLM 翻译重构为共享 OpenAI 兼容客户端的预置参数实例（公开签名与 glm-4 默认行为不变），LLM 批量提示词、`<...>` 提取、缓存过滤、结果折叠统一收敛到 `translates/shared.ts`
- Vite 插件 `transform` 分支逻辑收敛为单一调度器调用；翻译调用统一 try/catch，任何翻译源异常仅警告、不中断构建
- 插件版本号常量 `0.0.1` → `0.0.3`
- 演示应用切换为本地源验证（包名 alias 到 `src/autoi18n`），翻译源按环境变量条件配置（`ZHIPUAI_API_KEY` 或 `OPENAI_API_KEY`/`OPENAI_BASE_URL`/`OPENAI_MODEL`），无 Key 时走免费默认路径

### Tests

- 新增 57 个离线测试用例（语言映射、共享协议、免费源回退链与错误路径、OpenAI 兼容请求格式、调度器优先级、入口导出契约、免费/OpenAI/自定义优先级 Use Case），全量 `pnpm test:all` 通过

## [0.0.2] - 2026-08-24

补齐"开发基本要求"工程能力（对照 `docs/requirements.md` v0.0.2 清单，规格产物见 `specs/001-complete-dev-requirements/`）。

### Added

- 完整测试体系：
  - Vitest 单元测试（32 例）：翻译工具纯函数、文件读写（Node fs / XHR 双分支）、Vue 运行时插件（install / autoTranslate 回退与插值）
  - 集成测试：`autoi18nPlugin` 在真实 `vite build` 管线中对 SFC 注入翻译并替换调用
  - Use Case 测试：接入插件后"读缓存 → 采集翻译 → 保存合并"完整工作流
  - Playwright e2e 测试：演示应用自动国际化端到端链路（离线可运行，不调用大模型 API）
- 测试命令契约：`test` / `test:all` / `test:unit` / `test:integration` / `test:usecase` / `test:watch` / `test:e2e`
- 类型检查命令 `type-check`（`tsc --noEmit`，覆盖源码与测试代码）
- 提交规范门禁：commitlint（约定式提交）+ husky `commit-msg` 钩子，不合规提交本地拦截
- GitHub Actions CI 校验工作流：`main` 分支 push 与指向 `main` 的 PR 自动运行依赖安装、类型检查与全部测试（仅校验，不含部署）
- GitHub Issue 模板：Bug 报告、功能建议（中英双语字段）
- 中英双语 README（默认英文 `README.md`，中文 `README.zh-CN.md` 互链）与本更新日志
- 版本需求文档 `docs/requirements.md` 与 SpecKit 规格驱动开发产物

## [0.0.1] - 2026-08-23

> 依 git 历史补录，粒度到功能组。

### Added

- `autoi18n` Vue3 运行时插件：`$translate` / `autoTranslate` 翻译函数（回退原文、`{name}` 插值）、翻译内容按 `filePath` 加载
- `autoi18nPlugin` Vite 插件：开发阶段自动提取 `.vue` 中的待翻译文案、调用大模型翻译并注入模块、构建期读取/保存翻译内容（`translate.json`）
- 智谱 AI（glm-4）翻译接入，支持通过 `translate` 配置自定义翻译函数
- 演示应用（Vite + Vue3 + Pinia + Vue Router）
- npm 包构建与发布流程（gulp 版本管理，发布为 `auto-i18n-vue`）
