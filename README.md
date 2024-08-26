<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:27:11
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-26 16:39:27
 * @FilePath: /auto-i18n/README.md
 * @Description: autoi18n
-->
# autoi18n

`Vite`+`Vue3`+`大模型`开发阶段自动翻译文本内容，保存到文件中，生产环境拉取部署的翻译内容实现翻译。

## 支持

目前只支持`Vue3`+`Vite`。

## 安装

```sh
pnpm add -D autoi18n
```

## 使用

### 引入

* `main.ts`

```ts
import { createApp } from 'vue'
import { autoi18n, TranslateTarget } from 'autoi18n'

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
import { defineConfig } from 'vite'

import { autoi18nPlugin, TranslateTarget, TranslateAIModel } from 'autoi18n'
import { readTranslateJson, writeTranslateJson } from 'autoi18n'
import { Autoi18nMessages } from 'autoi18n/@types'

const readTranslateContent = async () => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    return await readTranslateJson(filePath)
}

const saveTranslateContent = async (data: Autoi18nMessages) => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    return await writeTranslateJson(filePath, data)
}

export default defineConfig(({ mode }) => {
    return {
        plugins: [
            autoi18nPlugin({
                isDev: mode !== 'production',
                locale: TranslateTarget.ZH,
                targets: [TranslateTarget.ZH, TranslateTarget.EN, TranslateTarget.JP, TranslateTarget.ARA],
                aiModelConfig: {
                    model: TranslateAIModel.ZHIPUAI,
                    config: {
                        apiKey: '*******',
                    }
                },
                readTranslateContent,
                // translate: autoi18nTranslate,
                saveTranslateContent,
            }),
            // 其他插件
        ],
        // 其他配置
    }
})
```

* `model`目前只支持`智谱AI`，后面将接入其他模型。对于翻译现在的大模型基本都没什么问题。
* 可以通过`translate`自定义翻译转换

### 使用

* 后面更新