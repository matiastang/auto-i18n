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
                aiModelConfig: {
                    model: TranslateAIModel.ZHIPUAI,
                    config: {
                        apiKey: env.ZHIPUAI_API_KEY || '',
                    },
                },
                readTranslateContent,
                // translate: myCustomTranslate, // optional custom translate function
                saveTranslateContent,
            }),
            // other plugins
        ],
        // other config
    }
})
```

* The AI model currently supports **Zhipu AI** only; more models will be integrated later. Any mainstream LLM handles this translation task well.
* You can plug in your own translation pipeline via the `translate` option.

### Writing translatable texts

Use `$translate(...)` in templates (or `autoTranslate(...)` in scripts). During development the Vite plugin extracts these texts, translates them, and rewrites the calls; at runtime the translation for the current locale is looked up (with `{name}`-style interpolation), falling back to the original text.

```vue
<template>
    <p>{{ $translate(`Hello, {name}`, { name: userName }) }}</p>
</template>
```

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

## License

[Apache-2.0](./LICENSE)
