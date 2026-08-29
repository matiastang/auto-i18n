# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## 语言约定

默认使用简体中文回答用户。代码、标识符、提交信息与 CLAUDE.md 正文等技术内容保持英文（与现有代码库一致）。

## Project Overview

`auto-i18n-vue` — automatic i18n for Vue 3 + Vite. UI texts marked with `$translate(...)` (templates) or `autoTranslate(...)` (scripts) are extracted and translated **at dev/build time** by a Vite plugin, persisted to a JSON translation file, and served at runtime — no manual translation work, no runtime translation cost.

The repo is a monorepo-like setup: `src/autoi18n/` is the publishable library; the rest of `src/` (views, Components, router) is a demo app that dogfoods the library.

## Common Commands

```sh
pnpm dev                        # demo app dev server (port 3001)
pnpm test                       # vitest: unit + integration + usecase (tests/**)
pnpm test:unit                  # only tests/unit
pnpm test:integration           # only tests/integration (runs real vite builds; slow)
pnpm test:usecase               # only tests/usecase
pnpm test:e2e                   # Playwright (needs `pnpm exec playwright install chromium` once)
pnpm test:all                   # vitest + playwright
pnpm type-check                 # tsc --noEmit over src, tests, and e2e
pnpm plugin:build               # full library build: tsc types + vite lib build + copy assets
```

Run a single test: `pnpm vitest run tests/unit/utils-translate.spec.ts` (or `pnpm test:watch` and filter). DOM-dependent test files opt into jsdom via `// @vitest-environment jsdom` at the top of the file; the default environment is `node`.

Commits follow Conventional Commits, enforced by commitlint + husky (activated by `pnpm install`).

## Architecture

### Two plugins, one contract

The library (`src/autoi18n/`) ships two halves that share the translation-file contract (`Autoi18nMessages`: hash-key → per-locale value map):

1. **Vite plugin** (`autoi18nPlugin.ts`) — build-time. `enforce: 'pre'` so it sees SFC source before `@vitejs/plugin-vue` compiles it. In `transform()` it:
   - extracts marked texts from `.vue` files via regex (`checkQuestions` in `utils/translate.ts`) — only the *first string literal argument* of `$translate`/`autoTranslate` is extracted; the call itself is rewritten to `_localeTranslate(` and an inject block is prepended to the SFC script providing per-module (subset) messages + a local lookup helper that `inject('$autoi18n')`s the runtime locale.
   - translates uncached texts, merges into the in-memory cache, and persists via the user-supplied `saveTranslateContent` callback. Writes are debounced (`SAVE_DEBOUNCE_MS = 3000`) during watch mode; `buildEnd()` flushes synchronously. **Translation failures must only warn — never break the build (FR-007).**
   - state (locale/targets/messages) is created per plugin instance — it used to be a module-level singleton, which broke multi-instance builds; keep it instance-scoped.
2. **Runtime plugin** (`autoi18n.ts`) — `app.use(autoi18n, { filePath, locale, targets })`. Loads the deployed JSON, provides `$autoi18n` (reactive locale state) and `$translate` globally. Interpolation uses `{key}` placeholders replaced with a function replacer (avoids `$&`/`$'` pattern-expansion bugs).

Version drift trap: `AUTOI18N_PLUGIN_VERSION` in `autoi18nPlugin.ts` is hardcoded and must be bumped in sync with `package.json` — package.json cannot be imported because `ts:build` (`src/autoi18n/tsconfig.json`) has `rootDir: src/autoi18n` and a cross-boundary import fails with TS6059.

### Translation source resolution (`translates/provider.ts`)

Fixed priority, resolved per-module in `transform()`: **custom `translate` fn > `aiModelConfig` LLM > free third-party translation (default)**. The free source (MyMemory, Google free endpoint fallback) needs no key and warns-and-skips on failure.

- `translates/openai.ts` is a thin wrapper over the shared OpenAI Chat Completions-compatible client in `translates/shared.ts` (batch prompt, `<...>`-wrapped results, cache filtering). OpenAI-compatible mode works with any `{baseUrl}/chat/completions` service (DeepSeek, Moonshot, Ollama, Zhipu GLM via `https://open.bigmodel.cn/api/paas/v4` + `glm-4`, …) and **requires both `apiKey` and `model`**; missing config — or a removed legacy model value like `'zhipuai'` — falls back to free translation with a once-only warning (module-level notify flags — don't add per-call logging in `resolveTranslateFunction`). Zhipu was a dedicated preset (`TranslateAIModel.ZHIPUAI`) until v0.0.3; v0.0.4 removed it as a plain config-value migration.
- `utils/translate.ts` keys messages by `translateHashKey` = MD5 hash (`crypto-js`) with `autoi18n_` prefix. Cache hits skip re-translation.

### Text extraction specifics (utils/translate.ts)

- String args are matched delimiter-close-aware (`'...'` / `"..."` / `` `...` ``) — do not "simplify" to a greedy `(.*)`; it breaks multi-call lines and quotes inside text.
- Inject code must only import `'vue'` and `'auto-i18n-vue'` — injected code runs in the *consumer's* project, so repo-internal aliases like `@autoi18n` are unresolvable there. The `@autoi18n` alias exists only for this repo's own tests (see `vitest.config.ts`) and demo.
- Injected message tables go through `JSON.stringify` — translations may contain quotes/newlines and bare concatenation produces invalid JS.
- SFCs without a `<script>` block get a `<script setup>` appended to host the inject code.

### Demo app

`src/views/autoi18nHome.vue`, `src/Components/`, `src/router/` — a Vue 3 + Pinia demo. `vite.config.ts` wires `autoi18nPlugin` with LLM keys from `.env.local`-style env vars, falling back to free translation when no key is set.

## Constraints & Gotchas

- **Pin Vue to 3.3.x** — upgrading to 3.4.38 breaks `tsc --build src/autoi18n/tsconfig.json` (`ToggleEvent` not found in `runtime-dom.d.ts`). Documented in PROJECT.md.
- Never log raw plugin config — it contains `aiModelConfig.apiKey` (CI log leak risk).
- `buildJs/` and `buildTypes/` under `src/autoi18n/` are `ts:build` artifacts (gitignored outputs of the library build) — don't hand-edit.
- Integration tests perform full vite builds; vitest timeout is raised to 120s for them.
- Spec-driven development: SpecKit (speckit skills) is integrated for new features — the same skill set is mirrored in `.zcode/skills/` (ZCode) and `.claude/skills/` (Claude Code); if you edit one, keep the other in sync. Workflow documented in PROJECT.md (`specs/` holds spec/plan/tasks artifacts).
