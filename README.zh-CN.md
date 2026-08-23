<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:27:11
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-26 16:39:27
 * @FilePath: /auto-i18n/README.zh-CN.md
 * @Description: autoi18n
-->
[English](./README.md) | [简体中文](./README.zh-CN.md)

# autoi18n

`Vite`+`Vue3`+`大模型`开发阶段自动翻译文本内容，保存到文件中，生产环境拉取部署的翻译内容实现翻译。

## 支持

目前只支持`Vue3`+`Vite`。

## 安装

```sh
pnpm add -D auto-i18n-vue
```

## 使用

### 引入

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

**注意** `filePath`是部署时，翻译内容保存的地址，如上是放在`public`文件夹下面

* `vite.config.ts`

```ts
// node路径
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
    // 读取本地环境变量，apiKey保存在不入库的.env.local中
    const env = loadEnv(mode, process.cwd(), '')
    return {
        plugins: [
            autoi18nPlugin({
                isDev: mode !== 'production',
                locale: TranslateTarget.ZH,
                targets: [TranslateTarget.ZH, TranslateTarget.EN, TranslateTarget.JP, TranslateTarget.ARA],
                // 翻译源按优先级自动选择：
                //   translate（自定义）> aiModelConfig（LLM）> 免费三方翻译（默认）
                aiModelConfig: env.ZHIPUAI_API_KEY
                    ? {
                          model: TranslateAIModel.ZHIPUAI,
                          config: { apiKey: env.ZHIPUAI_API_KEY },
                      }
                    : env.OPENAI_API_KEY
                      ? {
                            model: TranslateAIModel.OPENAI,
                            config: {
                                apiKey: env.OPENAI_API_KEY,
                                baseUrl: env.OPENAI_BASE_URL, // 如 https://api.deepseek.com
                                model: env.OPENAI_MODEL, // 如 deepseek-chat
                            },
                        }
                      : undefined, // 未配置任何 Key -> 免费三方翻译（默认）
                readTranslateContent,
                // translate: 自定义翻译函数（最高优先级，独占使用）,
                saveTranslateContent,
            }),
            // 其他插件
        ],
        // 其他配置
    }
})
```

### 翻译源

三种翻译源按优先级自动选择——`translate`（自定义）> `aiModelConfig`（LLM）> **免费三方翻译（默认）**：

1. **自定义翻译函数**——实现导出的 `TranslateFunction` 契约并传入 `translate`，优先且独占使用，适合自建翻译服务或需要术语表的场景。
2. **配置 LLM API Key**——`aiModelConfig` 支持：
    * `TranslateAIModel.OPENAI`：任一 **OpenAI Chat Completions 兼容**服务（OpenAI、DeepSeek、Moonshot/Kimi、通义千问兼容模式、本地 Ollama 等），配置 `apiKey` + `baseUrl` + `model`。
    * `TranslateAIModel.ZHIPUAI`：智谱 GLM（模型默认 `glm-4`），配置 `apiKey`。
3. **免费三方翻译（默认）**——前两者均未配置时，自动使用免费翻译服务（MyMemory 为主，Google 免费接口为备），**零配置、无需任何 API Key**。失败仅警告并跳过，不会中断构建；适合快速接入体验，注意存在速率限制。

已缓存的文案不会重复翻译，`{name}` 占位符保持原样，任何翻译错误只打印警告、不影响构建。

### 编写可翻译文案

模板中使用`$translate(...)`（脚本中使用`autoTranslate(...)`）。开发阶段 Vite 插件自动提取这些文案并翻译、改写调用；运行时按当前语言查找译文（支持`{name}`形式插值），未命中时回退原文。

```vue
<template>
    <p>{{ $translate(`你好，{name}`, { name: userName }) }}</p>
</template>
```

## 开发

```sh
pnpm install        # 安装依赖（自动激活 husky 钩子）
pnpm dev            # 启动演示应用（端口 3001）
pnpm test           # 单元/集成/Use Case 测试（Vitest）
pnpm test:e2e       # e2e 测试（Playwright，首次需 pnpm exec playwright install chromium）
pnpm test:all       # 一条命令运行全部测试
pnpm type-check     # TypeScript 类型检查（源码 + 测试）
```

提交信息遵循[约定式提交](https://www.conventionalcommits.org/zh-hans/)，由本地 commitlint + husky 强制校验；`main`分支的 push/PR 会触发 CI（类型检查 + 全部测试）。

## 许可

[Apache-2.0](./LICENSE)
