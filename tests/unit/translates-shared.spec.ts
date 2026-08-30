/*
 * @FilePath: /auto-i18n/tests/unit/translates-shared.spec.ts
 * @Description: src/autoi18n/translates/shared.ts 共享翻译协议单元测试（全部离线，stub fetch）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import {
    buildTranslateQuestion,
    parseNumberedTranslations,
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

describe('buildTranslateQuestion（编号协议）', () => {
    it('文本以编号标签包裹并用顿号连接', () => {
        expect(buildTranslateQuestion(['你好'])).toBe('<1>你好</1>')
        expect(buildTranslateQuestion(['你好，{name}', '科技'])).toBe('<1>你好，{name}</1>、<2>科技</2>')
    })

    it('空列表返回空字符串', () => {
        expect(buildTranslateQuestion([])).toBe('')
    })
})

describe('parseNumberedTranslations（编号解析，按序号回填）', () => {
    it('按序号提取全部译文', () => {
        expect(parseNumberedTranslations('<1>Hello</1>、<2>technology</2>', 2)).toEqual([
            'Hello',
            'technology',
        ])
        expect(parseNumberedTranslations('<1>Hello</1>', 1)).toEqual(['Hello'])
    })

    it('无标签返回 null', () => {
        expect(parseNumberedTranslations('没有任何标签', 1)).toBeNull()
    })

    it('缺失序号时返回 null（不被静默错位）', () => {
        expect(parseNumberedTranslations('<1>Hello</1>', 2)).toBeNull()
    })

    it('重复序号时返回 null', () => {
        expect(parseNumberedTranslations('<1>A</1>、<1>B</1>', 2)).toBeNull()
    })

    it('序号越界时返回 null', () => {
        expect(parseNumberedTranslations('<3>C</3>', 2)).toBeNull()
    })

    it('乱序输出按序号回填到正确位置（位置对齐回归）', () => {
        const out = '<2>technology</2>、<1>Hello, {name}</1>'
        expect(parseNumberedTranslations(out, 2)).toEqual(['Hello, {name}', 'technology'])
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
                    choices: [{ message: { content: '<1>Hello</1>、<2>technology</2>' } }],
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
        expect(lastMessage.content).toBe('将：<1>你好</1>、<2>科技</2>，翻译为英语。')
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
            json: () => Promise.resolve({ choices: [{ message: { content: '<1>Hello</1>' } }] }),
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
                json: () => Promise.resolve({ choices: [{ message: { content: '<1>Hello</1>' } }] }),
            })
            .mockResolvedValueOnce({
                ok: true,
                json: () => Promise.resolve({ choices: [{ message: { content: '<1>こんにちは</1>' } }] }),
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

    it('响应编号标签缺失时丢弃该目标整批并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn().mockResolvedValue({
            ok: true,
            json: () => Promise.resolve({ choices: [{ message: { content: '<1>only-one</1>' } }] }),
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
            json: () => Promise.resolve({ choices: [{ message: { content: '<1>username: </1>' } }] }),
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
