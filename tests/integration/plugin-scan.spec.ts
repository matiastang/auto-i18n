/*
 * @FilePath: /auto-i18n/tests/integration/plugin-scan.spec.ts
 * @Description: 集成测试——零标记扫描在真实 vite build 管线中生效（dev 与 production 双模式）
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

const fixtureRoot = fileURLToPath(new URL('./fixtures/scan-app/', import.meta.url))

const stubTranslate = () => async (questions: string[], _tos: unknown, from: TranslateTarget) => {
    const msgs: Autoi18nMessages = {}
    for (const q of questions) {
        msgs[translateHashKey(q)] = {
            [from]: q,
            [TranslateTarget.EN]: `EN(${q})`,
        } as Autoi18nMessageItem
    }
    return msgs
}

const buildScanApp = async (isDev: boolean, extraConfig: Record<string, unknown> = {}) => {
    const saved: Autoi18nMessages[] = []
    const result = (await build({
        configFile: false,
        root: fixtureRoot,
        logLevel: 'warn',
        plugins: [
            // 插件返回类型基于仓库 rollup 4 声明，与 vite 4 内置 rollup 3 类型结构冲突，
            // 运行时兼容，断言桥接（同 plugin-build.spec.ts）
            autoi18nPlugin({
                isDev,
                locale: TranslateTarget.ZH,
                targets: [TranslateTarget.ZH, TranslateTarget.EN],
                translate: stubTranslate(),
                readTranslateContent: async () => ({}),
                saveTranslateContent: async (data) => {
                    saved.push(data)
                    return true
                },
                ...extraConfig,
            }) as unknown as Plugin,
            vue(),
        ],
        resolve: {
            // 注入代码从包名 'auto-i18n-vue' 导入，别名到本地源（同 plugin-build.spec.ts）
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
    return { code, saved }
}

describe('集成：零标记扫描 × vite build（FR-001/FR-002/FR-003）', () => {
    it('dev 模式：零标记文案被提取翻译、改写为查表调用并注入', async () => {
        const { code, saved } = await buildScanApp(true)

        // 四类位置的文案全部提取并翻译
        const texts = ['零标记标题', '零标记插值', '零标记占位', '零标记提示', '零标记脚本文案']
        for (const text of texts) {
            expect(code).toContain(`EN(${text})`)
            expect(saved.some((s) => s[translateHashKey(text)]?.en === `EN(${text})`)).toBe(true)
        }
        // 改写为查表调用并注入（import 已被 rollup 消解进 bundle，注入形态由单测覆盖）
        expect(code).toContain('_autoScanTranslate')
        expect(code).toContain('_autoScanMessages')
    })

    it('production 模式：零标记路径仍注入子集表与查表调用（FR-003 prod 分支）', async () => {
        const { code, saved } = await buildScanApp(false)

        expect(code).toContain('_autoScanTranslate')
        expect(code).toContain('EN(零标记标题)')
        expect(saved.some((s) => s[translateHashKey('零标记标题')]?.en === 'EN(零标记标题)')).toBe(true)
    })

    it('误判防护：属性访问器/对象键/忽略标记覆盖的字符串原样保留且无词条（FR-005/FR-006）', async () => {
        const { code, saved } = await buildScanApp(true)

        // 属性访问器字符串：原样保留（esbuild 规范化为双引号）、无词条
        expect(code).toContain(`"中文属性名"`)
        expect(saved.some((s) => s[translateHashKey('中文属性名')])).toBe(false)
        // 忽略标记覆盖的语句：原样保留、无词条
        expect(code).toContain(`"忽略标记覆盖的文案"`)
        expect(saved.some((s) => s[translateHashKey('忽略标记覆盖的文案')])).toBe(false)
        // 对象值照常翻译
        expect(code).toContain('EN(正常翻译的对象值文案)')
    })

    it('autoScan: false 时零标记行为完全关闭（FR-010）', async () => {
        const { code, saved } = await buildScanApp(true, { autoScan: false })

        expect(code).not.toContain('_autoScanTranslate')
        expect(saved.some((s) => s[translateHashKey('零标记标题')])).toBe(false)
    })

    it('exclude 命中的文件跳过零标记扫描（FR-007）', async () => {
        const { code, saved } = await buildScanApp(true, { exclude: ['ZeroMark.vue'] })

        expect(code).not.toContain('EN(零标记标题)')
        expect(saved.some((s) => s[translateHashKey('零标记标题')])).toBe(false)
        // 排除规则不影响其它文件的零标记扫描
        expect(code).toContain('EN(正常翻译的对象值文案)')
    })
})
