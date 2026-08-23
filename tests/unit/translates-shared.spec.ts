/*
 * @FilePath: /auto-i18n/tests/unit/translates-shared.spec.ts
 * @Description: src/autoi18n/translates/shared.ts 共享翻译协议单元测试（全部离线，stub fetch）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    buildTranslateQuestion,
    extractContentBetweenTags,
    checkTranslateQuestions,
    translateMessage,
    chatCompletionsTranslate,
} from '../../src/autoi18n/translates/shared'
import { translateHashKey } from '../../src/autoi18n/utils/translate'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('buildTranslateQuestion', () => {
    it('文本以 <...> 包裹并用顿号连接（LLM 批量协议）', () => {
        expect(buildTranslateQuestion(['你好'])).toBe('<你好>')
        expect(buildTranslateQuestion(['你好，{name}', '科技'])).toBe('<你好，{name}>、<科技>')
    })

    it('空列表返回空字符串', () => {
        expect(buildTranslateQuestion([])).toBe('')
    })
})

describe('extractContentBetweenTags', () => {
    it('提取全部 <...> 内容并保持顺序', () => {
        expect(extractContentBetweenTags('<Hello, {name}>、<technology>')).toEqual([
            'Hello, {name}',
            'technology',
        ])
    })

    it('无标签时返回空数组', () => {
        expect(extractContentBetweenTags('没有任何标签')).toEqual([])
    })
})

describe('checkTranslateQuestions（缓存过滤）', () => {
    const cache = {
        [translateHashKey('已完整')]: {
            [TranslateTarget.ZH]: '已完整',
            [TranslateTarget.EN]: 'translated',
        },
        [translateHashKey('部分缓存')]: {
            [TranslateTarget.ZH]: '部分缓存',
            [TranslateTarget.EN]: 'part',
        },
    } as unknown as Parameters<typeof checkTranslateQuestions>[0]

    it('源语言与全部目标语言均已缓存的文案被过滤', () => {
        const res = checkTranslateQuestions(
            cache,
            ['已完整'],
            [TranslateTarget.EN],
        )
        expect(res).toEqual([])
    })

    it('任一目标语言缺失的文案保留（含仅缓存部分目标语言的文案）', () => {
        const res = checkTranslateQuestions(
            cache,
            ['已完整', '部分缓存', '新文案'],
            [TranslateTarget.EN, TranslateTarget.JP],
        )
        // 已完整：仅缓存 en，缺 jp；部分缓存：缺 jp；新文案：全部缺失
        expect(res).toEqual(['已完整', '部分缓存', '新文案'])
    })

    it('空缓存时全部保留', () => {
        expect(checkTranslateQuestions({}, ['a', 'b'], [TranslateTarget.EN])).toEqual(['a', 'b'])
    })
})

describe('translateMessage（结果折叠）', () => {
    it('键为原文哈希，源语言回填，多目标合并到同一键', () => {
        const from = TranslateTarget.ZH
        const res = translateMessage([
            {
                from,
                to: TranslateTarget.EN,
                trans_result: [{ src: '你好', dst: 'Hello' }],
            },
            {
                from,
                to: TranslateTarget.JP,
                trans_result: [{ src: '你好', dst: 'こんにちは' }],
            },
        ])
        const key = translateHashKey('你好')
        expect(res[key]).toEqual({
            [TranslateTarget.ZH]: '你好',
            [TranslateTarget.EN]: 'Hello',
            [TranslateTarget.JP]: 'こんにちは',
        })
    })

    it('src/dst 非字符串的条目被跳过', () => {
        const res = translateMessage([
            {
                from: TranslateTarget.ZH,
                to: TranslateTarget.EN,
                trans_result: [
                    { src: '正常', dst: 'ok' },
                    { src: '', dst: null as unknown as string },
                ],
            },
        ])
        expect(Object.keys(res)).toEqual([translateHashKey('正常')])
    })

    it('传入 cache 时在其基础上叠加', () => {
        const existing = { [translateHashKey('旧')]: { [TranslateTarget.EN]: 'old' } } as unknown as Autoi18nMessages
        const res = translateMessage(
            [
                {
                    from: TranslateTarget.ZH,
                    to: TranslateTarget.EN,
                    trans_result: [{ src: '新', dst: 'new' }],
                },
            ],
            existing,
        )
        expect(res[translateHashKey('旧')]).toEqual({ [TranslateTarget.EN]: 'old' })
        expect(res[translateHashKey('新')]).toEqual({
            [TranslateTarget.ZH]: '新',
            [TranslateTarget.EN]: 'new',
        })
    })
})

describe('chatCompletionsTranslate（OpenAI 兼容通用客户端）', () => {
    const options = {
        apiKey: 'test-key',
        baseUrl: 'https://api.example.com/v1',
        model: 'test-model',
    }

    it('按兼容格式请求：POST {baseUrl}/chat/completions、Bearer 头、body 携带 model 与批量提示词', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () =>
                Promise.resolve({
                    choices: [{ message: { content: '<Hello>、<technology>' } }],
                }),
        })
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
        )
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const [url, init] = fetchMock.mock.calls[0]
        expect(url).toBe('https://api.example.com/v1/chat/completions')
        expect(init.method).toBe('POST')
        const headers = init.headers as Record<string, string>
        expect(headers.Authorization).toBe('Bearer test-key')
        expect(headers['Content-Type']).toBe('application/json')
        const body = JSON.parse(init.body)
        expect(body.model).toBe('test-model')
        const lastMessage = body.messages[body.messages.length - 1]
        expect(lastMessage.role).toBe('user')
        expect(lastMessage.content).toBe('将：<你好>、<科技>，翻译为英语。')
        // 提示词要求保留大括号占位符
        expect(body.messages[0].content).toContain('大括号')
        expect(res).toEqual([
            {
                from: TranslateTarget.ZH,
                to: TranslateTarget.EN,
                trans_result: [
                    { src: '你好', dst: 'Hello' },
                    { src: '科技', dst: 'technology' },
                ],
            },
        ])
    })

    it('baseUrl 末尾斜杠容错拼接', async () => {
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: '<Hello>' } }] }),
        })
        vi.stubGlobal('fetch', fetchMock)
        await chatCompletionsTranslate(
            { ...options, baseUrl: 'https://api.example.com/v1/' },
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
        )
        expect(fetchMock.mock.calls[0][0]).toBe('https://api.example.com/v1/chat/completions')
    })

    it('多目标语言逐个请求并汇总', async () => {
        const fetchMock = vi
            .fn()
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: '<Hello>' } }] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: '<こんにちは>' } }] }),
            })
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好'],
            [TranslateTarget.EN, TranslateTarget.JP],
            TranslateTarget.ZH,
        )
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res).toHaveLength(2)
        expect(res[0].trans_result[0].dst).toBe('Hello')
        expect(res[1].trans_result[0].dst).toBe('こんにちは')
    })

    it('响应条数与请求条数不符时丢弃该目标整批并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: '<only-one>' } }] }),
        })
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好', '科技'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
        )
        expect(res).toEqual([])
        expect(warnSpy).toHaveBeenCalled()
    })

    it('fetch 抛错/响应结构异常时警告并跳过该目标（不中断）', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi
            .fn()
            .mockRejectedValueOnce(new Error('network down'))
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ error: { message: 'invalid api key' } }),
            })
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好'],
            [TranslateTarget.EN, TranslateTarget.JP],
            TranslateTarget.ZH,
        )
        expect(res).toEqual([])
        expect(warnSpy).toHaveBeenCalled()
    })

    it('译文丢失 {name} 占位符时丢弃该目标整批并警告（FR-006）', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: true,
            status: 200,
            json: () => Promise.resolve({ choices: [{ message: { content: '<username: >' } }] }),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['用户名：{name}'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
        )
        expect(res).toEqual([])
        expect(warnSpy).toHaveBeenCalled()
    })

    it('HTTP 非 200 时跳过该目标并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: false,
            status: 401,
            json: () => Promise.resolve({}),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
        )
        expect(res).toEqual([])
        expect(warnSpy).toHaveBeenCalled()
    })

    it('无待翻译文本时不发请求', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(options, [], [TranslateTarget.EN], TranslateTarget.ZH)
        expect(fetchMock).not.toHaveBeenCalled()
        expect(res).toEqual([])
    })

    it('目标语言无描述时跳过该目标并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const res = await chatCompletionsTranslate(
            options,
            ['你好'],
            ['unknown' as TranslateTarget],
            TranslateTarget.ZH,
        )
        expect(fetchMock).not.toHaveBeenCalled()
        expect(res).toEqual([])
        expect(warnSpy).toHaveBeenCalled()
    })
})
