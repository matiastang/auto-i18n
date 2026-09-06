<!-- prettier-ignore -->
[English](./README.md) | [简体中文](./README.zh-CN.md)

# autoi18n

Automatic i18n for Vue 3 + Vite: with a large language model (LLM) translating your UI texts **during development** and persisting them to a translation file, your production build simply loads the deployed translations — no manual translation work, no runtime translation cost.

> `Vite` + `Vue3` + `LLM`: texts are translated automatically at dev time, saved to a file, and pulled from the deployed translation content in production.

## Support

Currently supports `Vue3` + `Vite` only.

## Install

```sh
pnpm add -D auto-i18n-vue
```

## Usage

### Runtime plugin (Vue)

* `main.ts`

```ts
import { createApp } from 'vue'
import { autoi18n, TranslateTarget } from 'auto-i18n-vue'

const app = createApp(App)

app.use(autoi18n, {
    filePath: '/translate.json',
    locale: TranslateTarget.ZH,
    targets: [TranslateTarget.ZH, TranslateTarget.EN],
})
```

**Note**: `filePath` is where the deployed translation content lives — in the example above it is served from the `public` folder.

### Vite plugin (build time)

* `vite.config.ts`

```ts
// node path
import path from 'path'
// vite
import { defineConfig, loadEnv } from 'vite'

import {
    autoi18nPlugin,
    TranslateTarget,
    TranslateAIModel,
    readTranslateJson,
    writeTranslateJson,
} from 'auto-i18n-vue'
import { Autoi18nMessages } from 'auto-i18n-vue'

const readTranslateContent = async () => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    return await readTranslateJson(filePath)
}

const saveTranslateContent = async (data: Autoi18nMessages) => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    return await writeTranslateJson(filePath, data)
}

export default defineConfig(({ mode }) => {
    // load local env vars; keep your apiKey in a git-ignored .env.local
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [
            autoi18nPlugin({
                isDev: mode !== 'production',
                locale: TranslateTarget.ZH,
                targets: [TranslateTarget.ZH, TranslateTarget.EN, TranslateTarget.JP, TranslateTarget.ARA],
                // Translation source is resolved by priority:
                //   translate (custom) > aiModelConfig (LLM) > free translation (default)
                aiModelConfig: env.OPENAI_API_KEY
                    ? {
                          model: TranslateAIModel.OPENAI,
                          config: {
                              apiKey: env.OPENAI_API_KEY,
                              baseUrl: env.OPENAI_BASE_URL, // e.g. https://api.deepseek.com
                              model: env.OPENAI_MODEL, // e.g. deepseek-chat
                          },
                      }
                    : undefined, // no key configured -> free translation (default)
                readTranslateContent,
                // translate: myCustomTranslate, // optional custom translate function (highest priority)
                saveTranslateContent,
            }),
            // other plugins
        ],
        // other config
    }
})
```

### Translation sources

Three translation sources are resolved by priority — `translate` (custom) > `aiModelConfig` (LLM) > **free translation (default)**:

1. **Custom translate function** — implement the exported `TranslateFunction` contract and pass it as `translate`. It is used exclusively, perfect for in-house MT services or glossary-aware pipelines.
2. **LLM with API key** — `aiModelConfig` supports:
    * `TranslateAIModel.OPENAI`: any **OpenAI Chat Completions compatible** service (OpenAI, DeepSeek, Moonshot/Kimi, Qwen compatible mode, Zhipu GLM, local Ollama, …) — configure `apiKey` + `baseUrl` + `model`.

   > **Migrating from Zhipu GLM** (`TranslateAIModel.ZHIPUAI` was removed in v0.0.4) — the equivalent configuration, producing byte-identical requests:
   >
   > ```ts
   > aiModelConfig: {
   >     model: TranslateAIModel.OPENAI,
   >     config: {
   >         apiKey: '<zhipu-api-key>',
   >         baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
   >         model: 'glm-4',
   >     },
   > }
   > ```
3. **Free third-party translation (default)** — when neither of the above is configured, texts are translated via free services (MyMemory, falling back to Google's free endpoint) with **zero configuration and no API key**. Failures are warned and skipped; they never break the build. Best for quickly trying the library; rate limits apply.

Already-cached texts are never re-translated, `{name}` placeholders are preserved, and any translation error only logs a warning without interrupting the build.

### Zero-markup auto scan (v0.2.0, on by default)

Since v0.2.0 you don't have to wrap texts at all — write Chinese (or Japanese/Korean) directly and the plugin finds and translates them during build:

```vue
<script setup lang="ts">
import { computed } from 'vue'

// Script texts that must follow locale switching go inside computed
// (top-level literals are evaluated once at setup and won't update on switch)
const label = computed(() => `保存修改`)
// This one is excluded by the ignore marker right above it:
/* autoi18n-ignore */
const keep = '这一句不翻译'
</script>

<template>
    <p>直接书写的中文文案</p>
    <p>{{ '插值表达式中的中文' }}</p>
    <input :placeholder="'绑定属性中的中文'"/>
    <span>{{ label }}</span>
</template>
```

How it works:

- A string participates in the scan when it contains at least one CJK character (Han / Kana / Hangul). Pure-ASCII strings (routes, event names, class names) are never touched — pure-English source projects are out of scope for this mode.
- Non-copy positions are protected and never rewritten: object keys, computed member access (`obj['中文key']`), import paths, comments.
- Interpolated template literals (`` `共${n}条` ``) and static (non-bound) attributes (`placeholder="中文"`) are skipped in this version — use the explicit API for interpolated texts (`autoTranslate(\`共{n}条\`, { n })`).
- Template texts and expressions update reactively on locale switch; **top-level script literals are evaluated once at setup** — wrap them in `computed` when they must follow locale switching.
- Explicit `$translate` / `autoTranslate` calls keep working unchanged; their texts are never double-processed and both styles can be mixed freely in the same file.
- Components written with a plain `<script>` (Options API) have their **template texts conservatively skipped** (script literals are still translated) — the module-level lookup helper is not visible to `_ctx.*` template expressions; use the explicit `$translate` (global property) for Options-API templates.
- If the host project uses a Vue version newer than the bundled compiler and a new template syntax cannot be parsed, that file is safely skipped (texts stay as-is) — the build never breaks.

Ignore markers (opt out locally):

```vue
<template>
    <!-- autoi18n-ignore -->
    <p>这个元素的文案与绑定表达式不参与翻译</p>
</template>
```

Plugin options:

```ts
autoi18nPlugin({
    // ... zero-markup scanning is enabled by default
    autoScan: false,          // turn it off entirely (behaves like pre-0.2.0)
    exclude: ['src/generated', /\.gen\.vue$/], // skip the scan for matched files
})
```

### Writing translatable texts

Use `$translate(...)` in templates (or `autoTranslate(...)` in scripts). During development the Vite plugin extracts these texts, translates them, and rewrites the calls; at runtime the translation for the current locale is looked up (with `{name}`-style interpolation), falling back to the original text.

```vue
<script setup lang="ts">
import { autoTranslate } from 'auto-i18n-vue'

// Static texts in scripts: option lists, enum labels, notifications, etc.
const featureTitle = autoTranslate(`The source text is the key`)
// Interpolation in scripts: `{count}` placeholders survive translation as-is
const badgeText = autoTranslate(`Total entries: {count}`, { count: 128 })
</script>

<template>
    <!-- Static template text: the source text is the key, no naming needed -->
    <h1>{{ $translate(`Auto i18n demo`) }}</h1>
    <!-- Template interpolation: string / number values, reactive on locale switch -->
    <p>{{ $translate(`User name: {name}`, { name: userName }) }}</p>
    <p>{{ $translate(`You have {count} unread messages`, { count: unread }) }}</p>
    <!-- Bound attributes: placeholders, titles, etc. are translated too -->
    <input type="text" :placeholder="$translate(`Enter your user name`)"/>
</template>
```

A few extra notes:

- The source text is the key — texts are stored under their MD5 hash, so there are no key names to maintain and identical texts are translated only once.
- All three string delimiters (`'`, `"`, `` ` ``) work; texts containing quotes are still extracted correctly.

## Development

```sh
pnpm install        # install dependencies (activates husky hooks)
pnpm dev            # start the demo app (port 3001)
pnpm test           # unit + integration + use-case tests (Vitest)
pnpm test:e2e       # e2e tests (Playwright, needs `pnpm exec playwright install chromium` once)
pnpm test:all       # everything above in one command
pnpm type-check     # TypeScript type checking (source + tests)
```

Commit messages follow [Conventional Commits](https://www.conventionalcommits.org/) and are enforced locally by commitlint + husky. CI runs on every push/PR to `main` (type check + all tests).

npm publishing is tag-driven: bump the version in `package.json`, commit, then `git tag v0.0.5 && git push origin v0.0.5` — the [release workflow](./.github/workflows/release.yml) verifies the tag matches the version, builds, publishes, and creates a GitHub Release (requires the `NPM_TOKEN` repo secret).

## License

[Apache-2.0](./LICENSE)
