/*
 * @FilePath: /auto-i18n/tests/unit/translates-openai.spec.ts
 * @Description: src/autoi18n/translates/openai.ts OpenAI 兼容翻译源单元测试
 * （全部离线：stub fetch，验证 OpenAI Chat Completions 兼容请求格式与解析）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { openaiTranslate, DEFAULT_OPENAI_BASE_URL, DEFAULT_OPENAI_MODEL } from '../../src/autoi18n/translates/openai'
import { translateHashKey } from '../../src/autoi18n/utils/translate'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

const chatResponse = (content: string) => ({
    choices: [{ message: { content } }],
})

const stubFetch = () => {
    const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
        ok: true,
        json: () => Promise.resolve(chatResponse('<Hello>、<technology>')),
    }))
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('openaiTranslate（OpenAI Chat Completions 兼容）', () => {
    it('按兼容格式请求：POST {baseUrl}/chat/completions、Bearer 头、body 携带 model', async () => {
        const fetchMock = stubFetch()
        const res = await openaiTranslate(
            { apiKey: 'sk-test', baseUrl: 'https://api.deepseek.com', model: 'deepseek-chat' },
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.deepseek.com/chat/completions')
        expect(init.method).toBe('POST')
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer sk-test')
        const body = JSON.parse(String(init.body))
        expect(body.model).toBe('deepseek-chat')
        // 提示词含批量协议与占位符保留指令
        expect(body.messages[body.messages.length - 1].content).toBe('将：<你好>、<科技>，翻译为英语。')
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.EN]).toBe('Hello')
        expect(res?.[translateHashKey('科技')]?.[TranslateTarget.EN]).toBe('technology')
    })

    it('未配置 baseUrl/model 时使用 OpenAI 默认值', async () => {
        const fetchMock = stubFetch()
        await openaiTranslate(
            { apiKey: 'sk-test' },
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe(`${DEFAULT_OPENAI_BASE_URL}/chat/completions`)
        expect(JSON.parse(String(init.body)).model).toBe(DEFAULT_OPENAI_MODEL)
    })

    it('返回值键为原文哈希且源语言回填', async () => {
        stubFetch()
        const res = await openaiTranslate(
            { apiKey: 'sk-test' },
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.ZH]).toBe('你好')
    })

    it('响应条数与请求不符→丢弃整批返回 null 并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async () => ({
            ok: true,
            json: () => Promise.resolve(chatResponse('<only-one>')),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const res = await openaiTranslate(
            { apiKey: 'sk-test' },
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(res).toBeNull()
        expect(warnSpy).toHaveBeenCalled()
    })

    it('请求失败（非 200/reject）→警告并返回 null', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn().mockRejectedValue(new Error('401 unauthorized'))
        vi.stubGlobal('fetch', fetchMock)
        const res = await openaiTranslate(
            { apiKey: 'bad-key' },
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(res).toBeNull()
    })

    it('questions 为空直接返回 null 且零请求', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const res = await openaiTranslate({ apiKey: 'sk-test' }, [], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(res).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('缓存完整命中→零请求返回 null', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const cache = {
            [translateHashKey('已缓存')]: {
                [TranslateTarget.ZH]: '已缓存',
                [TranslateTarget.EN]: 'cached',
            },
        } as unknown as Autoi18nMessages
        const res = await openaiTranslate(
            { apiKey: 'sk-test' },
            ['已缓存'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            cache,
        )
        expect(res).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })
})
