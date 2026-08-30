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
                aiModelConfig: env.OPENAI_API_KEY
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
    * `TranslateAIModel.OPENAI`：任一 **OpenAI Chat Completions 兼容**服务（OpenAI、DeepSeek、Moonshot/Kimi、通义千问兼容模式、智谱 GLM、本地 Ollama 等），配置 `apiKey` + `baseUrl` + `model`。

   > **智谱 GLM 用户迁移**（v0.0.4 已移除 `TranslateAIModel.ZHIPUAI`）——等价配置如下，产生的请求逐字段一致：
   >
   > ```ts
   > aiModelConfig: {
   >     model: TranslateAIModel.OPENAI,
   >     config: {
   >         apiKey: '<智谱 apiKey>',
   >         baseUrl: 'https://open.bigmodel.cn/api/paas/v4',
   >         model: 'glm-4',
   >     },
   > }
   > ```
3. **免费三方翻译（默认）**——前两者均未配置时，自动使用免费翻译服务（MyMemory 为主，Google 免费接口为备），**零配置、无需任何 API Key**。失败仅警告并跳过，不会中断构建；适合快速接入体验，注意存在速率限制。

已缓存的文案不会重复翻译，`{name}` 占位符保持原样，任何翻译错误只打印警告、不影响构建。

### 编写可翻译文案

模板中使用`$translate(...)`（脚本中使用`autoTranslate(...)`）。开发阶段 Vite 插件自动提取这些文案并翻译、改写调用；运行时按当前语言查找译文（支持`{name}`形式插值），未命中时回退原文。

```vue
<script setup lang="ts">
import { autoTranslate } from 'auto-i18n-vue'

// 脚本侧静态文案：下拉选项、枚举描述、通知语等
const featureTitle = autoTranslate(`中文即 Key`)
// 脚本侧插值：{count} 占位符翻译时保持原样
const badgeText = autoTranslate(`词条总数：{count}`, { count: 128 })
</script>

<template>
    <!-- 模板静态文案：原文即 Key，无需起名 -->
    <h1>{{ $translate(`自动国际化演示`) }}</h1>
    <!-- 模板插值：string / number 均可，切换语言响应式更新 -->
    <p>{{ $translate(`用户名：{name}`, { name: userName }) }}</p>
    <p>{{ $translate(`您有 {count} 条未读消息`, { count: unread }) }}</p>
    <!-- 属性绑定：placeholder、title 等同样参与翻译 -->
    <input type="text" :placeholder="$translate(`请输入用户名`)"/>
</template>
```

补充说明：

- 原文即 Key——文案经 MD5 哈希作为词条键，无需维护键名，相同文案只翻译一次。
- 三种字符串定界符（`'`、`"`、`` ` ``）均可使用，文案内含引号也能被正确提取。

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

发布 npm 包走标签触发：升`package.json`版本并提交 → `git tag v0.0.5 && git push origin v0.0.5`，[发布工作流](./.github/workflows/release.yml)会校验 tag 与版本一致、构建并发布，同时创建 GitHub Release（需在仓库 Secret 中配置`NPM_TOKEN`）。

## 许可

[Apache-2.0](./LICENSE)
