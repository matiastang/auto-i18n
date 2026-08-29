/*
 * @FilePath: /auto-i18n/tests/unit/translates-zhipuai.spec.ts
 * @Description: src/autoi18n/translates/zhipuai.ts 智谱翻译源单元测试
 * （全部离线：stub fetch，重点覆盖默认模型与自定义模型透传）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { zhipuaiTranslate, DEFAULT_ZHIPUAI_MODEL } from '../../src/autoi18n/translates/zhipuai'
import { translateHashKey } from '../../src/autoi18n/utils/translate'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'

const chatResponse = (content: string) => ({
    choices: [{ message: { content } }],
})

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('zhipuaiTranslate（智谱 Chat Completions 兼容端点）', () => {
    it('未指定模型时使用默认 glm-4 发往智谱端点', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () => Promise.resolve(chatResponse('<1>Hello</1>')),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const res = await zhipuaiTranslate(
            'zhipu-key',
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://open.bigmodel.cn/api/paas/v4/chat/completions')
        expect(JSON.parse(String(init.body)).model).toBe(DEFAULT_ZHIPUAI_MODEL)
        expect((init.headers as Record<string, string>).Authorization).toBe('Bearer zhipu-key')
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.EN]).toBe('Hello')
    })

    it('透传调用方指定的模型名（此前被静默忽略）', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () => Promise.resolve(chatResponse('<1>Hello</1>')),
        }))
        vi.stubGlobal('fetch', fetchMock)
        await zhipuaiTranslate(
            'zhipu-key',
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
            'glm-4-plus',
        )
        expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).model).toBe('glm-4-plus')
    })

    it('空字符串模型名回退默认值', async () => {
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            json: () => Promise.resolve(chatResponse('<1>Hello</1>')),
        }))
        vi.stubGlobal('fetch', fetchMock)
        await zhipuaiTranslate(
            'zhipu-key',
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
            '',
        )
        expect(JSON.parse(String(fetchMock.mock.calls[0][1].body)).model).toBe(DEFAULT_ZHIPUAI_MODEL)
    })
})
