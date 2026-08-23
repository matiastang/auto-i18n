/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:15:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:15:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/free.ts
 * @Description: 免费三方翻译源（默认翻译行为，无需任何 API Key）
 * 服务链：MyMemory（主，免费匿名接口）→ Google 免费网页接口（备），逐条文本回退；
 * 单条失败仅警告并跳过，不影响其余文案与构建流程。
 */
import { Autoi18nMessages, Autoi18nMessageItem } from '../@types/autoi18n'
import { TranslateTarget } from '../@types/enum'
import { toIsoLocale } from '../utils/language'
import { translateHashKey } from '../utils/translate'
import { checkTranslateQuestions } from './shared'

// MyMemory 免费匿名接口（单次一个 q，中文用 zh-CN）
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'
// Google 翻译免费网页接口（gtx，无 Key；多 q 交叠不可靠，一次一条）
const GOOGLE_GTX_URL = 'https://translate.googleapis.com/translate_a/single'
// MyMemory 单条查询上限约 500 字符，预留余量
const FREE_TEXT_MAX_LENGTH = 450

/**
 * 单条文本翻译服务（失败抛错，由回退链处理）
 */
interface FreeService {
    /**
     * 服务名（警告日志用）
     */
    name: string
    /**
     * 翻译单条文本
     * @param text 原文
     * @param fromIso 源语言 ISO 代码
     * @param toIso 目标语言 ISO 代码
     * @returns 译文；失败抛错
     */
    translateOne: (text: string, fromIso: string, toIso: string) => Promise<string>
}

/**
 * 解码译文中的基础 HTML 实体（MyMemory 常见 &#39; 等）
 * @param text 译文
 * @returns 解码后文本
 */
const decodeHtmlEntities = (text: string): string => {
    return text
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCharCode(Number(code)))
        .replace(/&quot;/g, '"')
        .replace(/&apos;/g, "'")
        .replace(/&lt;/g, '<')
        .replace(/&gt;/g, '>')
        .replace(/&amp;/g, '&')
}

/**
 * MyMemory 免费翻译服务
 */
const myMemoryService: FreeService = {
    name: 'MyMemory',
    translateOne: async (text, fromIso, toIso) => {
        const url = `${MYMEMORY_URL}?q=${encodeURIComponent(text)}&langpair=${encodeURIComponent(
            `${fromIso}|${toIso}`,
        )}`
        const res = await fetch(url)
        const data = await res.json()
        if (data?.quotaFinished === true || String(data?.responseStatus) !== '200') {
            throw new Error(`MyMemory 响应异常：${data?.responseDetails || data?.responseStatus}`)
        }
        const translated = data?.responseData?.translatedText
        if (typeof translated !== 'string' || !translated) {
            throw new Error('MyMemory 未返回译文')
        }
        return decodeHtmlEntities(translated)
    },
}

/**
 * Google 翻译免费网页接口服务
 */
const googleGtxService: FreeService = {
    name: 'Google',
    translateOne: async (text, fromIso, toIso) => {
        const url = `${GOOGLE_GTX_URL}?client=gtx&sl=${fromIso}&tl=${toIso}&dt=t&q=${encodeURIComponent(text)}`
        const res = await fetch(url)
        const data = await res.json()
        const translated = data?.[0]?.[0]?.[0]
        if (typeof translated !== 'string' || !translated) {
            throw new Error('Google 未返回译文')
        }
        return translated
    },
}

/**
 * 免费服务链（顺序即优先级：MyMemory 在中国大陆网络可达性更好，作为主服务）
 */
const FREE_SERVICES: FreeService[] = [myMemoryService, googleGtxService]

/**
 * 带回退的单条翻译：依次尝试服务链，全部失败返回 null
 * @param text 原文
 * @param fromIso 源语言 ISO 代码
 * @param toIso 目标语言 ISO 代码
 * @returns 译文；全链失败返回 null
 */
const translateWithFallback = async (
    text: string,
    fromIso: string,
    toIso: string,
): Promise<string | null> => {
    for (const service of FREE_SERVICES) {
        try {
            return await service.translateOne(text, fromIso, toIso)
        } catch (error) {
            console.warn(
                `免费翻译（${service.name}）失败，尝试下一个服务：`,
                error instanceof Error ? error.message : error,
            )
        }
    }
    return null
}

/**
 * 免费三方翻译（TranslateFunction 契约实现）
 * 逐条文本 × 每个目标语言请求；先过滤已完整缓存的文案
 * @param questions 待翻译文案
 * @param tos 目标语言
 * @param from 源语言
 * @param cache 翻译缓存
 * @returns 新增译文；无新增或全部失败返回 null
 */
export const freeTranslate = async (
    questions: string[],
    tos: TranslateTarget[],
    from: TranslateTarget,
    cache?: Autoi18nMessages,
): Promise<Autoi18nMessages | null> => {
    const translateTos = tos.filter((item) => item !== from)
    if (!questions.length || !translateTos.length) {
        return null
    }
    const nQuestions = checkTranslateQuestions(cache || {}, questions, translateTos)
    if (!nQuestions.length) {
        console.log('免费翻译：全部命中缓存，无需翻译')
        return null
    }
    const fromIso = toIsoLocale(from)
    if (!fromIso) {
        console.warn(`免费翻译：源语言 ${from} 缺少 ISO 映射，跳过翻译`)
        return null
    }
    const messages: Autoi18nMessages = {}
    let failedCount = 0
    for (const to of translateTos) {
        const toIso = toIsoLocale(to)
        if (!toIso) {
            console.warn(`免费翻译：目标语言 ${to} 缺少 ISO 映射，跳过该目标`)
            continue
        }
        for (const question of nQuestions) {
            if (question.length > FREE_TEXT_MAX_LENGTH) {
                console.warn(`免费翻译：文本超过 ${FREE_TEXT_MAX_LENGTH} 字符，跳过：${question}`)
                failedCount += 1
                continue
            }
            const dst = await translateWithFallback(question, fromIso, toIso)
            if (dst === null) {
                failedCount += 1
                console.warn(`免费翻译：全部免费服务失败，跳过该条：${question}`)
                continue
            }
            const key = translateHashKey(question)
            const item = messages[key]
            if (item) {
                item[to] = dst
            } else {
                messages[key] = {
                    [from]: question,
                    [to]: dst,
                } as Autoi18nMessageItem
            }
        }
    }
    if (!Object.keys(messages).length) {
        console.warn('免费翻译：没有产生任何译文（MyMemory/Google 均不可用或文本被跳过）')
        return null
    }
    if (failedCount > 0) {
        console.warn(`免费翻译：共 ${failedCount} 条翻译失败已跳过`)
    }
    return messages
}

export default freeTranslate
