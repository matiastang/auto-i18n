/*
 * @FilePath: /auto-i18n/tests/unit/translates-provider.spec.ts
 * @Description: src/autoi18n/translates/provider.ts 翻译源优先级调度单元测试
 * 优先级：自定义 translate > LLM(aiModelConfig 有效) > 免费三方翻译（默认）
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { TranslateTarget, TranslateAIModel } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

beforeEach(() => {
    vi.resetModules()
})

const loadModules = async () => {
    const provider = await import('../../src/autoi18n/translates/provider')
    const free = await import('../../src/autoi18n/translates/free')
    return { resolveTranslateFunction: provider.resolveTranslateFunction, freeTranslate: free.freeTranslate }
}

describe('resolveTranslateFunction（三级优先级）', () => {
    it('无任何翻译配置：返回免费翻译源并打印一次性提示', async () => {
        const infoSpy = vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { resolveTranslateFunction, freeTranslate } = await loadModules()
        const config = {
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        }
        const fn = resolveTranslateFunction(config)
        expect(fn).toBe(freeTranslate)
        // 提示只打印一次（模块级去重）
        resolveTranslateFunction(config)
        expect(infoSpy).toHaveBeenCalledTimes(1)
        expect(warnSpy).not.toHaveBeenCalled()
    })

    it('配置了 translate：直接返回该自定义函数（最高优先级）', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const { resolveTranslateFunction } = await loadModules()
        const custom = async () => null
        const fn = resolveTranslateFunction({
            translate: custom,
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        expect(fn).toBe(custom)
    })

    it('aiModelConfig 未知模型：警告并回退免费翻译源', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { resolveTranslateFunction, freeTranslate } = await loadModules()
        const fn = resolveTranslateFunction({
            aiModelConfig: {
                model: 'unknown-model' as never,
                config: { apiKey: 'key' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        expect(fn).toBe(freeTranslate)
        expect(warnSpy).toHaveBeenCalled()
    })

    it('aiModelConfig apiKey 为空：警告并回退免费翻译源', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { resolveTranslateFunction, freeTranslate } = await loadModules()
        const fn = resolveTranslateFunction({
            aiModelConfig: {
                model: TranslateTarget.ZH as never,
                config: { apiKey: '' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        expect(fn).toBe(freeTranslate)
        expect(warnSpy).toHaveBeenCalled()
    })

    it('返回的函数可被调用（签名兼容 TranslateFunction）', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('offline test')))
        const { resolveTranslateFunction } = await loadModules()
        const fn = resolveTranslateFunction({
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        const res = await fn(
            ['测试'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {} as Autoi18nMessages,
        )
        expect(res).toBeNull()
        vi.unstubAllGlobals()
    })
})

describe('resolveTranslateFunction（LLM 分支行为验证，stub fetch）', () => {
    const chatResponse = { choices: [{ message: { content: '<Hello>' } }] }

    it('model=OPENAI 且 apiKey/model 齐备：返回 OpenAI 兼容源（请求发往配置的 baseUrl）', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () => Promise.resolve(chatResponse),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const { resolveTranslateFunction } = await loadModules()
        const fn = resolveTranslateFunction({
            aiModelConfig: {
                model: TranslateAIModel.OPENAI,
                config: { apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        const res = await fn(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.deepseek.com/chat/completions')
        expect(JSON.parse(String(init.body)).model).toBe('deepseek-chat')
        expect(res && Object.values(res)[0]?.[TranslateTarget.EN]).toBe('Hello')
        vi.unstubAllGlobals()
    })

    it('model=OPENAI 缺 model：警告并回退免费翻译源', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const { resolveTranslateFunction, freeTranslate } = await loadModules()
        const fn = resolveTranslateFunction({
            aiModelConfig: {
                model: TranslateAIModel.OPENAI,
                config: { apiKey: 'sk-test' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        expect(fn).toBe(freeTranslate)
        expect(warnSpy).toHaveBeenCalled()
    })

    it('model=ZHIPUAI 且 apiKey 齐备：返回智谱源（默认 glm-4 发往智谱端点）', async () => {
        vi.spyOn(console, 'info').mockImplementation(() => {})
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () => Promise.resolve(chatResponse),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const { resolveTranslateFunction } = await loadModules()
        const fn = resolveTranslateFunction({
            aiModelConfig: {
                model: TranslateAIModel.ZHIPUAI,
                config: { apiKey: 'zhipu-key' },
            },
            readTranslateContent: async () => ({}),
            saveTranslateContent: async () => true,
        })
        const res = await fn(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions')
        expect(JSON.parse(String(init.body)).model).toBe('glm-4')
        expect(res && Object.values(res)[0]?.[TranslateTarget.EN]).toBe('Hello')
        vi.unstubAllGlobals()
    })
})
