# Quickstart: v0.0.3 验证指南

**Date**: 2026-08-24 | **Status**: Complete | **Spec**: [spec.md](./spec.md)

## 前置条件

- Node ≥ 18、pnpm 10.17.1；已执行 `pnpm install`
- 自动化验证**无需任何 API Key、无需外网**

## 1. 离线自动化验证（对应 SC-004/SC-005）

```bash
pnpm type-check     # 类型检查
pnpm test           # 单元 + 集成 + Use Case（全离线：fetch 均 stub）
pnpm test:e2e       # 演示应用 e2e（demo 文案已缓存，不触发网络翻译）
```

预期：全部通过。关键新增用例：
- `tests/unit/utils-language.spec.ts`——ISO 映射正确性、未知语言 null
- `tests/unit/translates-openai.spec.ts`——OpenAI 兼容请求格式与解析、错误→null
- `tests/unit/translates-free.spec.ts`——MyMemory/Google 解析、回退链、配额与网络错误路径
- `tests/unit/translates-provider.spec.ts`——三级优先级与无效配置回退
- `tests/usecase/translate-workflow.spec.ts`——免费源/OpenAI 源的完整工作流（buildStart→transform→buildEnd→缓存落盘）

## 2. 零配置免费翻译端到端验证（对应 SC-001，一次性人工验证）

```bash
# 备份演示缓存后清空，强制触发真实免费翻译
cp public/translate.json public/translate.json.bak
echo '{}' > public/translate.json
pnpm dev            # 打开 http://localhost:3001
```

预期：
- 控制台出现"未配置翻译源，已默认使用免费三方翻译"提示
- `public/translate.json` 重新出现 `autoi18n_<md5>` 键的多语言条目（来自 MyMemory；网络环境不同可能走 Google 备链）
- 页面文案正常（开发期注入），刷新后从缓存读取不再发起请求

验证后恢复：`mv public/translate.json.bak public/translate.json`

> 本验证调用的是免费接口（MyMemory/Google 免费网页接口），符合"不调用收费 API"的约束；它属于一次性人工验证，不进入自动化测试与 CI。

## 3. LLM 翻译验证（对应 SC-002，可选，需自有 Key）

```bash
# .env.local 中配置任一 OpenAI 兼容服务（示例为 DeepSeek）
OPENAI_API_KEY=sk-xxx
OPENAI_BASE_URL=https://api.deepseek.com
OPENAI_MODEL=deepseek-chat
pnpm dev
```

预期：翻译请求走 `{baseUrl}/chat/completions`（Bearer 鉴权），译文写入缓存。**自动化测试不执行此步**（请求格式与解析已由 stub 用例离线覆盖）。

## 4. 自定义翻译验证（对应 SC-003，可离线）

在 `vite.config.ts` 中提供任意满足 [TranslateFunction 契约](./contracts/translation-providers.md#c-1-翻译接口契约用户自定义翻译的唯一依赖) 的函数（如返回 `EN(原文)` 的字典），即可观察到它被优先且独占地使用——Use Case 测试已覆盖该路径。

## 5. 库构建验证

```bash
pnpm plugin:build   # 产出 dist/（es/umd/cjs/iife + 类型），确认无构建错误
```
