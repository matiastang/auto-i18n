/*
 * @FilePath: /auto-i18n/tests/unit/translates-free.spec.ts
 * @Description: src/autoi18n/translates/free.ts 免费三方翻译源单元测试
 * （全部离线：stub fetch 返回 MyMemory/Google 免费接口的假响应，形状来自真实接口探测）
 */
import { afterEach, describe, expect, it, vi } from 'vitest'
import { freeTranslate } from '../../src/autoi18n/translates/free'
import { translateHashKey } from '../../src/autoi18n/utils/translate'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

/** MyMemory 形状假响应（真实接口 2026-08-24 探测） */
const myMemoryResponse = (text: string) => ({
    responseData: { translatedText: text, match: 0.99 },
    quotaFinished: false,
    responseDetails: '',
    responseStatus: 200,
})

/** Google gtx 形状假响应（嵌套数组，取 data[0][0][0]） */
const googleResponse = (text: string) => [[[text, '原文', null, null, 10]], null, 'zh-CN']

const stubFetch = (impl: (url: string) => Promise<unknown>) => {
    const fetchMock = vi.fn(async (url: string | URL) => {
        const data = await impl(url.toString())
        return {
            ok: true,
            json: () => Promise.resolve(data),
        }
    })
    vi.stubGlobal('fetch', fetchMock)
    return fetchMock
}

afterEach(() => {
    vi.unstubAllGlobals()
    vi.restoreAllMocks()
})

describe('freeTranslate（MyMemory 主 + Google 备回退链）', () => {
    it('优先使用 MyMemory：请求 langpair 形式并解析 responseData.translatedText', async () => {
        const fetchMock = stubFetch(async (url) => {
            expect(url.startsWith('https://api.mymemory.translated.net/get?')).toBe(true)
            const parsed = new URL(url)
            expect(parsed.searchParams.get('q')).toBe('你好，世界')
            expect(parsed.searchParams.get('langpair')).toBe('zh-CN|en')
            return myMemoryResponse('Hello world')
        })
        const res = await freeTranslate(
            ['你好，世界'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(fetchMock).toHaveBeenCalledTimes(1)
        const key = translateHashKey('你好，世界')
        expect(res?.[key]).toEqual({
            [TranslateTarget.ZH]: '你好，世界',
            [TranslateTarget.EN]: 'Hello world',
        })
    })

    it('语言枚举映射为三方 ISO 代码（jp→ja）', async () => {
        const fetchMock = stubFetch(async (url) => {
            const parsed = new URL(url)
            expect(parsed.searchParams.get('langpair')).toBe('zh-CN|ja')
            return myMemoryResponse('こんにちは、世界。')
        })
        const res = await freeTranslate(
            ['你好，世界'],
            [TranslateTarget.JP],
            TranslateTarget.ZH,
            {},
        )
        expect(res?.[translateHashKey('你好，世界')]?.[TranslateTarget.JP]).toBe('こんにちは、世界。')
        expect(fetchMock).toHaveBeenCalled()
    })

    it('多目标语言逐条请求并合并到同一键', async () => {
        const fetchMock = stubFetch(async (url) => {
            const to = new URL(url).searchParams.get('langpair')?.split('|')[1]
            return myMemoryResponse(to === 'en' ? 'Hello' : 'こんにちは')
        })
        const res = await freeTranslate(
            ['你好'],
            [TranslateTarget.EN, TranslateTarget.JP],
            TranslateTarget.ZH,
            {},
        )
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res?.[translateHashKey('你好')]).toEqual({
            [TranslateTarget.ZH]: '你好',
            [TranslateTarget.EN]: 'Hello',
            [TranslateTarget.JP]: 'こんにちは',
        })
    })

    it('MyMemory 失败时回退 Google gtx（同一条文本）', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = stubFetch(async (url) => {
            if (url.startsWith('https://api.mymemory.translated.net')) {
                // MyMemory 配额/异常形状
                return { responseData: { translatedText: '' }, quotaFinished: true, responseStatus: 403 }
            }
            expect(url.startsWith('https://translate.googleapis.com/translate_a/single?')).toBe(true)
            const parsed = new URL(url)
            expect(parsed.searchParams.get('client')).toBe('gtx')
            expect(parsed.searchParams.get('sl')).toBe('zh-CN')
            expect(parsed.searchParams.get('tl')).toBe('en')
            expect(parsed.searchParams.get('q')).toBe('你好')
            return googleResponse('Hello')
        })
        const res = await freeTranslate(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.EN]).toBe('Hello')
        expect(warnSpy).toHaveBeenCalled()
    })

    it('MyMemory responseStatus 非 200（含字符串状态）视为失败并回退', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = stubFetch(async (url) => {
            if (url.startsWith('https://api.mymemory.translated.net')) {
                return { responseData: { translatedText: 'x' }, responseStatus: '429' }
            }
            return googleResponse('Hello')
        })
        const res = await freeTranslate(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.EN]).toBe('Hello')
    })

    it('双链全部失败：跳过该条、警告，整体返回 null', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn().mockRejectedValue(new Error('network down'))
        vi.stubGlobal('fetch', fetchMock)
        const res = await freeTranslate(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res).toBeNull()
        expect(warnSpy).toHaveBeenCalled()
    })

    it('questions 为空直接返回 null 且零请求', async () => {
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const res = await freeTranslate([], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(res).toBeNull()
        expect(fetchMock).not.toHaveBeenCalled()
    })

    it('缓存完整命中的文案不发起请求，仅翻译缺失项', async () => {
        const fetchMock = stubFetch(async () => myMemoryResponse('World'))
        const cache = {
            [translateHashKey('已缓存')]: {
                [TranslateTarget.ZH]: '已缓存',
                [TranslateTarget.EN]: 'cached',
            },
        } as unknown as Autoi18nMessages
        const res = await freeTranslate(
            ['已缓存', '新文案'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            cache,
        )
        // 仅"新文案"发起 1 次请求
        expect(fetchMock).toHaveBeenCalledTimes(1)
        expect(res?.[translateHashKey('新文案')]?.[TranslateTarget.EN]).toBe('World')
        expect(res?.[translateHashKey('已缓存')]).toBeUndefined()
    })

    it('目标语言缺少 ISO 映射时跳过该目标并警告', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn()
        vi.stubGlobal('fetch', fetchMock)
        const res = await freeTranslate(
            ['你好'],
            ['unknown' as TranslateTarget],
            TranslateTarget.ZH,
            {},
        )
        expect(fetchMock).not.toHaveBeenCalled()
        expect(res).toBeNull()
        expect(warnSpy).toHaveBeenCalled()
    })

    it('单条失败只影响该条，其余文案继续翻译', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = stubFetch(async (url) => {
            const q = new URL(url).searchParams.get('q')
            if (q === '失败文案') {
                throw new Error('boom')
            }
            return myMemoryResponse(`EN(${q})`)
        })
        const res = await freeTranslate(
            ['失败文案', '正常文案'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        // 失败文案尝试 2 个服务，正常文案 1 次
        expect(fetchMock).toHaveBeenCalledTimes(3)
        expect(res?.[translateHashKey('失败文案')]).toBeUndefined()
        expect(res?.[translateHashKey('正常文案')]?.[TranslateTarget.EN]).toBe('EN(正常文案)')
    })

    it('译文中的 HTML 实体被解码（MyMemory 常见 &#39; 等）', async () => {
        stubFetch(async () => myMemoryResponse('It&#39;s ok &amp; fine'))
        const res = await freeTranslate(['没关系'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(res?.[translateHashKey('没关系')]?.[TranslateTarget.EN]).toBe("It's ok & fine")
    })

    it('占位符保护：译文丢失 {name} 时视为该服务失败并回退（FR-006）', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = stubFetch(async (url) => {
            if (url.startsWith('https://api.mymemory.translated.net')) {
                // MyMemory 把 {name} 翻译掉了
                return myMemoryResponse('username: ')
            }
            // Google 保留占位符
            return googleResponse('username: {name}')
        })
        const res = await freeTranslate(
            ['用户名：{name}'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res?.[translateHashKey('用户名：{name}')]?.[TranslateTarget.EN]).toBe('username: {name}')
    })

    it('占位符保护：全部服务均丢失占位符时跳过该条并返回 null', async () => {
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = stubFetch(async () => myMemoryResponse('username: '))
        const res = await freeTranslate(
            ['用户名：{name}'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        // MyMemory 与 Google 均丢失占位符，各尝试一次
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res).toBeNull()
        expect(warnSpy).toHaveBeenCalled()
    })

    it('HTTP 非 200 视为失败并回退下一服务', async () => {
        vi.spyOn(console, 'warn').mockImplementation(() => {})
        const fetchMock = vi.fn(async (_url: string, _init?: RequestInit) => ({
            ok: false,
            status: 503,
            json: () => Promise.resolve({}),
        }))
        vi.stubGlobal('fetch', fetchMock)
        const res = await freeTranslate(['你好'], [TranslateTarget.EN], TranslateTarget.ZH, {})
        expect(fetchMock).toHaveBeenCalledTimes(2)
        expect(res).toBeNull()
    })

    it('源语言回填：返回值包含源语言原文', async () => {
        stubFetch(async () => myMemoryResponse('Hello'))
        const res = await freeTranslate(
            ['你好'],
            [TranslateTarget.EN],
            TranslateTarget.ZH,
            {},
        )
        expect(res?.[translateHashKey('你好')]?.[TranslateTarget.ZH]).toBe('你好')
    })
})
