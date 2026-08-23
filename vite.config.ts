/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 22:55:07
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-26 16:52:30
 * @Description: vite配置文件
 */
// node路径
import path from 'path'
// vite
import { defineConfig, loadEnv } from 'vite'
// 解析.vue文件
import vue from '@vitejs/plugin-vue'
// import config from './loadenv'

import Inspect from 'vite-plugin-inspect'
import _package from './package.json'

// 本地源验证（v0.0.3 未发布能力；发布后可切回下方 npm 包导入）
import { autoi18nPlugin, TranslateTarget, TranslateAIModel, readTranslateJson, writeTranslateJson } from './src/autoi18n/index'
import { Autoi18nMessages, } from './src/autoi18n/@types/autoi18n'
import { TranslateAIModelConfig } from './src/autoi18n/@types/autoi18nPlugin'

// 本地打包测试
// import { autoi18nPlugin, TranslateTarget, TranslateAIModel } from './dist/index.es.js'
// import { readTranslateJson, writeTranslateJson } from './dist/index.es.js'
// import { Autoi18nMessages } from './dist/@types'

// npm包测试
// import { autoi18nPlugin, TranslateTarget, TranslateAIModel, readTranslateJson, writeTranslateJson } from 'auto-i18n-vue'
// import { Autoi18nMessages } from 'auto-i18n-vue'

const readTranslateContent = async () => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    console.log('readTranslateContent', filePath)
    console.log(typeof window === 'undefined')
    return await readTranslateJson(filePath)
}

const saveTranslateContent = async (data: Autoi18nMessages) => {
    const filePath = path.resolve(__dirname, './public/translate.json')
    console.log('saveTranslateContent', filePath)
    console.log(data)
    return await writeTranslateJson(filePath, data)
}

export default defineConfig(({ mode }) => {
    // 读取本地环境变量，apiKey保存在不入库的.env.local中
    const env = loadEnv(mode, process.cwd(), '')
    // 翻译源：环境变量存在则使用对应 LLM（智谱/OpenAI 兼容），否则零配置走免费三方翻译（默认）
    let aiModelConfig: TranslateAIModelConfig | undefined
    if (env.ZHIPUAI_API_KEY) {
        aiModelConfig = {
            model: TranslateAIModel.ZHIPUAI,
            config: {
                apiKey: env.ZHIPUAI_API_KEY,
            },
        }
    } else if (env.OPENAI_API_KEY) {
        aiModelConfig = {
            model: TranslateAIModel.OPENAI,
            config: {
                apiKey: env.OPENAI_API_KEY,
                baseUrl: env.OPENAI_BASE_URL,
                model: env.OPENAI_MODEL,
            },
        }
    }
    return {
        // 共享配置
        plugins: [
            autoi18nPlugin({
                isDev: mode !== 'production',
                locale: TranslateTarget.ZH,
                targets: [TranslateTarget.ZH, TranslateTarget.EN, TranslateTarget.JP, TranslateTarget.ARA],
                aiModelConfig,
                readTranslateContent,
                // translate: autoi18nTranslate,
                saveTranslateContent,
            }),
            vue(),
            Inspect(),
        ],
        resolve: {
            // 别名
            alias: [
                { find: 'root', replacement: path.resolve(__dirname, './') },
                { find: '@', replacement: path.resolve(__dirname, './src') },
                { find: '@autoi18n', replacement: path.resolve(__dirname, './src/autoi18n') },
                // 演示应用经包名引用本地源（验证未发布能力；发布后可移除）
                { find: 'auto-i18n-vue', replacement: path.resolve(__dirname, './src/autoi18n/index.ts') },
            ],
        },
        css: {
            modules: {
                /**
                 * generateScopedName和hashPrefix申明了，使用cssModules时样式的名称转换
                 */
                generateScopedName: '[name]-[local]-[hash:base64:6]',
                hashPrefix: 'prefix',
                localsConvention: 'camelCaseOnly',
            },
            // CSS 预处理器的选项
            preprocessorOptions: {
                less: {
                    additionalData: '@import "@/style/less/index.less";',
                    // 支持内联 JavaScript
                    javascriptEnabled: true,
                },
                scss: {
                //     additionalData: `
                //     @use "@/style/scss/element-variables.scss" as * ;
                //     @use "@/style/scss/index.scss" as * ;
                // `,
                    additionalData: `@use "@/style/scss/index.scss" as * ;`,
                },
                sass: {},
            },
        },
        // 开发服务配置
        server: {
            host: '0.0.0.0',
            port: 3001,
            strictPort: true,
            fs: {
                strict: false,
            },
            // headers: {
            //     'Access-Control-Allow-Origin': '*',
            // }
            // proxy: {
            //     // 选项写法
            //     [config.VITE_APP_BASE_API]: {
            //         target: config.VITE_APP_BASE_HOST, // 所要代理的目标地址
            //         rewrite: (path) => path.replace(/^\/dev-api/, ''), // 重写传过来的path路径，比如 `/api/index/1?id=10&name=zs`（注意:path路径最前面有斜杠（/），因此，正则匹配的时候不要忘了是斜杠（/）开头的；选项的 key 也是斜杠（/）开头的）
            //         changeOrigin: true, // true/false, Default: false - changes the origin of the host header to the target URL
            //     },
            // },
        },
        // 构建配置
        build: {
            // outDir: mode === 'production' ? `dist_${_package.version}` : 'dist',
            outDir: 'dist',
        },
    }
})
