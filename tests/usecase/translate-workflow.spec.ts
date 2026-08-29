/*
 * @FilePath: /auto-i18n/tests/usecase/translate-workflow.spec.ts
 * @Description: Use Case——接入插件后"读缓存 → 采集翻译 → 保存合并"完整工作流
 *
 * 说明：autoi18nPlugin 内部状态（autoi18nPluginInfo）是模块级单例，
 * 每个用例前 vi.resetModules() 后动态 import，保证用例间隔离。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InputOptions } from 'rollup'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessageItem, Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

/** 生成一个含 $translate 调用的最小 SFC */
const sfc = (text: string) =>
    `<template>\n  <p>{{ $translate(\`${text}\`) }}</p>\n</template>\n<script setup lang="ts">\n</script>\n`

/** 字典式 mock 翻译（离线，绝不调用 AI）——已缓存的 key 返回 null 以模拟真实翻译源 */
const dictionaryTranslate = async (
    questions: string[],
    _tos: TranslateTarget[],
    from: TranslateTarget,
    cache?: Autoi18nMessages
) => {
    const msgs: Autoi18nMessages = {}
    for (const q of questions) {
        const key = translateHashKey(q)
        // 模拟 translate 源的真实行为：已缓存的 key 不重翻译
        if (cache && cache[key] && cache[key]?.[TranslateTarget.EN]) {
            continue
        }
        msgs[key] = {
            [from]: q,
            [TranslateTarget.EN]: `EN(${q})`,
        } as Autoi18nMessageItem
    }
    return Object.keys(msgs).length ? msgs : null
}

beforeEach(() => {
    vi.resetModules()
})

const loadPlugin = async () => {
    const mod = await import('../../src/autoi18n/autoi18nPlugin')
    return mod.autoi18nPlugin
}

describe('Use Case: 翻译采集工作流', () => {
    it('buildStart 读缓存 → transform 采集新文案并注入 → buildEnd 保存合并结果', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const cachedKey = translateHashKey('已有文案')

        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({
                [cachedKey]: {
                    zh: '已有文案',
                    en: 'Existing',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        // 1. 构建开始：读取既有缓存
        await plugin.buildStart({} as InputOptions)

        // 2. 开发转换：新文案触发翻译并注入本模块（缓存合并发生在保存阶段）
        const code = sfc('新文案')
        const out = await plugin.transform(code, '/project/src/App.vue')
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('EN(新文案)')
        expect(out).not.toContain('$translate(')
        // 注入代码只依赖接入方可解析的模块（'vue' 与包名），不得使用仓库内 @autoi18n 别名
        expect(out).toContain(`import { translateHashKey } from 'auto-i18n-vue'`)
        expect(out).not.toContain(`'@autoi18n`)
        // 注入副本的插值同样使用函数式替换串（$& 等特殊模式不展开）
        expect(out).toContain(`() => String(_val)`)

        // 3. 构建结束：保存"缓存 ∪ 新译文"
        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        const merged = saved[0]
        expect(merged[cachedKey]?.en).toBe('Existing')
        expect(merged[translateHashKey('新文案')]?.en).toBe('EN(新文案)')
        expect(merged[translateHashKey('新文案')]?.zh).toBe('新文案')
    })

    it('全部命中缓存（translate 返回 null）时回退缓存注入且不触发保存', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saveFn = vi.fn(async () => true)
        const cachedKey = translateHashKey('缓存文案')
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: vi.fn(async () => null),
            readTranslateContent: async () => ({
                [cachedKey]: {
                    zh: '缓存文案',
                    en: 'Cached',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: saveFn,
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('缓存文案'), '/project/src/App.vue')
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('Cached')

        await plugin.buildEnd()
        expect(saveFn).not.toHaveBeenCalled()
    })

    it('isDev=false 生产模式不注入代码，但新译文仍被保存', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const plugin = autoi18nPlugin({
            isDev: false,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({}),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        await plugin.buildStart({} as InputOptions)
        const code = sfc('生产文案')
        const out = await plugin.transform(code, '/project/src/App.vue')
        expect(out).toBe(code)

        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        expect(saved[0][translateHashKey('生产文案')]?.en).toBe('EN(生产文案)')
    })
})

describe('Use Case: 免费三方翻译工作流（默认翻译源，stub fetch）', () => {
    /** MyMemory 形状假响应 */
    const myMemoryResponse = (text: string) => ({
        responseData: { translatedText: text, match: 0.99 },
        quotaFinished: false,
        responseStatus: 200,
    })

    it('零配置（无 translate/aiModelConfig）→ 免费翻译 → 注入 → 落盘', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: () => Promise.resolve(myMemoryResponse('Hello, free world')),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            // 不配置 translate / aiModelConfig —— 免费翻译应为默认行为
            readTranslateContent: async () => ({}),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('免费文案'), '/project/src/App.vue')
        expect(fetchMock).toHaveBeenCalled()
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('Hello, free world')

        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        expect(saved[0][translateHashKey('免费文案')]?.en).toBe('Hello, free world')
        expect(saved[0][translateHashKey('免费文案')]?.zh).toBe('免费文案')
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('免费翻译全部失败（网络不可用）：仅警告、不中断、不落盘', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
        const autoi18nPlugin = await loadPlugin()
        const saveFn = vi.fn(async () => true)
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            readTranslateContent: async () => ({}),
            saveTranslateContent: saveFn,
        })

        await plugin.buildStart({} as InputOptions)
        const code = sfc('失败文案')
        const out = await plugin.transform(code, '/project/src/App.vue')
        // 注入仍发生（回退缓存=空），但不中断构建
        expect(out).toContain('_localeTranslate')
        expect(warnSpy).toHaveBeenCalled()

        await plugin.buildEnd()
        expect(saveFn).not.toHaveBeenCalled()
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })
})

describe('Use Case: OpenAI 兼容 LLM 翻译工作流（stub fetch）', () => {
    it('配置 OPENAI（apiKey/baseUrl/model）→ 兼容接口翻译 → 注入 → 落盘', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () =>
                Promise.resolve({ choices: [{ message: { content: '<1>Hello, LLM world</1>' } }] }),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            aiModelConfig: {
                model: 'openai' as never,
                config: { apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('LLM 文案'), '/project/src/App.vue')
        const [url] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.deepseek.com/chat/completions')
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('Hello, LLM world')

        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        expect(saved[0][translateHashKey('LLM 文案')]?.en).toBe('Hello, LLM world')
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })
})

describe('Use Case: 自定义翻译函数优先级（最高且独占）', () => {
    it('同时配置 translate 与 aiModelConfig 时仅自定义函数被调用（零网络请求）', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            aiModelConfig: {
                model: 'openai' as never,
                config: { apiKey: 'sk-test', model: 'any-model' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('优先级文案'), '/project/src/App.vue')
        expect(fetchMock).not.toHaveBeenCalled()
        expect(out).toContain('EN(优先级文案)')
        await plugin.buildEnd()
        expect(saved[0][translateHashKey('优先级文案')]?.en).toBe('EN(优先级文案)')
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('自定义函数抛异常：警告、不中断、不落盘', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const autoi18nPlugin = await loadPlugin()
        const saveFn = vi.fn(async () => true)
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: async () => {
                throw new Error('custom translate boom')
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: saveFn,
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('异常文案'), '/project/src/App.vue')
        expect(out).toContain('_localeTranslate')
        expect(warnSpy).toHaveBeenCalled()
        await plugin.buildEnd()
        expect(saveFn).not.toHaveBeenCalled()
        vi.restoreAllMocks()
    })
})

describe('Use Case: 子集注入（仅内联本模块文案）', () => {
    it('transform 输出不得携带"未在本模块出现"的缓存键', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const autoi18nPlugin = await loadPlugin()
        const cachedKey1 = translateHashKey('本模块文案')
        const cachedKey2 = translateHashKey('其它模块文案')

        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({
                [cachedKey1]: {
                    zh: '本模块文案',
                    en: 'ModuleText',
                } as Autoi18nMessageItem,
                [cachedKey2]: {
                    zh: '其它模块文案',
                    en: 'OtherModuleText',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: async () => true,
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('本模块文案'), '/project/src/App.vue')

        // 本模块文案应出现在注入字面量中
        expect(out).toContain('ModuleText')
        // 子集注入关键回归：未出现的其它模块文案不应被内联到本模块代码里
        expect(out).not.toContain('OtherModuleText')
        expect(out).not.toContain(translateHashKey('其它模块文案'))
        // 调用点被替换为 _localeTranslate
        expect(out).toContain('_localeTranslate')

        await plugin.buildEnd()
        vi.restoreAllMocks()
    })

    it('混合模块：本模块新文案触发翻译，注入同时携带本模块新增+命中缓存的旧文案', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const autoi18nPlugin = await loadPlugin()
        const cachedKey = translateHashKey('旧缓存文案')
        const newKey = translateHashKey('本模块新文案')

        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({
                [cachedKey]: {
                    zh: '旧缓存文案',
                    en: 'CachedOld',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: async () => true,
        })

        await plugin.buildStart({} as InputOptions)
        // SFC 中同时引用「本模块新文案」（要翻译）+ 「旧缓存文案」（命中缓存）
        const mixedSfc =
            `<template>` +
            `<p>{{ $translate(\`本模块新文案\`) }}</p>` +
            `<p>{{ $translate(\`旧缓存文案\`) }}</p>` +
            `</template>` +
            `<script setup lang="ts"></script>`
        const out = await plugin.transform(mixedSfc, '/project/src/App.vue')

        // 两种文案都应被注入（缓存 ∪ 新增为源，按本模块涉及文案内联）
        expect(out).toContain('EN(本模块新文案)')
        expect(out).toContain('CachedOld')
        // 注入代码的 hash 键应包含两者
        expect(out).toContain(newKey)
        expect(out).toContain(cachedKey)

        await plugin.buildEnd()
        vi.restoreAllMocks()
    })
})
