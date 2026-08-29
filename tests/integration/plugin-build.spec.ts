/*
 * @FilePath: /auto-i18n/tests/integration/plugin-build.spec.ts
 * @Description: 集成测试——autoi18nPlugin 在真实 vite build 管线中生效
 */
import { fileURLToPath } from 'node:url'
import { describe, expect, it } from 'vitest'
import { build, Plugin } from 'vite'
import vue from '@vitejs/plugin-vue'
import { RollupOutput } from 'rollup'
import { autoi18nPlugin } from '../../src/autoi18n/autoi18nPlugin'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessageItem, Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

const fixtureRoot = fileURLToPath(new URL('./fixtures/app/', import.meta.url))

describe('集成：autoi18nPlugin × vite build', () => {
    it('插件在完整构建管线中对 SFC 注入翻译并替换调用', async () => {
        const saved: Autoi18nMessages[] = []
        const result = (await build({
            configFile: false,
            root: fixtureRoot,
            logLevel: 'warn',
            plugins: [
                // 插件返回类型基于仓库 rollup 4 的 InputOptions 声明，与 vite 4 内置
                // 的 rollup 3 类型存在结构冲突，运行时兼容，这里用断言桥接
                autoi18nPlugin({
                    isDev: true,
                    locale: TranslateTarget.ZH,
                    targets: [TranslateTarget.ZH, TranslateTarget.EN],
                    translate: async (questions, _tos, from) => {
                        const msgs: Autoi18nMessages = {}
                        for (const q of questions) {
                            msgs[translateHashKey(q)] = {
                                [from]: q,
                                [TranslateTarget.EN]: `EN(${q})`,
                            } as Autoi18nMessageItem
                        }
                        return msgs
                    },
                    readTranslateContent: async () => ({}),
                    saveTranslateContent: async (data) => {
                        saved.push(data)
                        return true
                    },
                }) as unknown as Plugin,
                vue(),
            ],
            resolve: {
                // 注入代码从包名 'auto-i18n-vue' 导入 translateHashKey（不再依赖仓库内
                // @autoi18n 别名）。仓库 devDependencies 固定的是已发布的 0.0.1（无该
                // 导出），这里别名到本地源，等价于消费方安装了含此导出的正式版本
                alias: [
                    {
                        find: 'auto-i18n-vue',
                        replacement: fileURLToPath(new URL('../../src/autoi18n/index.ts', import.meta.url)),
                    },
                ],
            },
            build: { write: false, minify: false },
        })) as RollupOutput

        const code = result.output
            .map((chunkOrAsset) => (chunkOrAsset.type === 'chunk' ? chunkOrAsset.code : ''))
            .join('\n')

        // 注入的运行时翻译函数与译文存在
        expect(code).toContain('_localeTranslate')
        expect(code).toContain('EN(你好，世界)')
        expect(code).toContain('EN(欢迎你，{name})')
        // 原始 $translate 调用被完全替换
        expect(code).not.toContain('$translate(')
        // buildEnd 保存了全部采集文案
        expect(saved).toHaveLength(1)
        expect(saved[0][translateHashKey('你好，世界')]?.en).toBe('EN(你好，世界)')
        expect(saved[0][translateHashKey('欢迎你，{name}')]?.en).toBe(
            'EN(欢迎你，{name})'
        )
    })
})
