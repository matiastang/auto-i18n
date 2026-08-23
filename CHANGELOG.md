# 更新日志 / Changelog

本文件记录项目的所有重要变更。格式基于 [Keep a Changelog](https://keepachangelog.com/zh-CN/1.1.0/)，版本遵循 [语义化版本](https://semver.org/lang/zh-CN/)。

All notable changes to this project will be documented in this file. The format is based on Keep a Changelog, and this project adheres to Semantic Versioning.

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
