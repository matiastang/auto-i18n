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
