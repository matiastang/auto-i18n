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
import { checkTranslateQuestions, placeholdersPreserved } from './shared'

// MyMemory 免费匿名接口（单次一个 q，中文用 zh-CN）
const MYMEMORY_URL = 'https://api.mymemory.translated.net/get'
// Google 翻译免费网页接口（gtx，无 Key；多 q 交叠不可靠，一次一条）
const GOOGLE_GTX_URL = 'https://translate.googleapis.com/translate_a/single'
// MyMemory 单条查询上限约 500 字符，预留余量
const FREE_TEXT_MAX_LENGTH = 450
// 单次免费请求超时（毫秒）——翻译运行在构建 transform 钩子内，必须可超时退出
const FREE_REQUEST_TIMEOUT_MS = 10_000
// 并发请求数上限：文案多时逐条串行会让构建显著变慢
const FREE_CONCURRENCY = 5
// 连续失败熔断阈值：服务整体不可达时避免对剩余文案继续无效请求
// （每条「回退链整体失败」计 1 次，任一成功即清零；须大于单条失败的连续次数，避免误伤孤立失败）
const FAILURE_TRIP_LIMIT = 6

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
        .replace(/&#(\d+);/g, (_, code: string) => String.fromCodePoint(Number(code)))
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
        const res = await fetch(url, { signal: AbortSignal.timeout(FREE_REQUEST_TIMEOUT_MS) })
        if (!res.ok) {
            throw new Error(`MyMemory HTTP ${res.status}`)
        }
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
        const res = await fetch(url, { signal: AbortSignal.timeout(FREE_REQUEST_TIMEOUT_MS) })
        if (!res.ok) {
            throw new Error(`Google HTTP ${res.status}`)
        }
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
            const dst = await service.translateOne(text, fromIso, toIso)
            // 占位符（{name}）必须原样保留（FR-006）——三方机器翻译可能翻译/丢弃大括号内容，
            // 丢失即视为该服务失败，交给回退链处理
            if (!placeholdersPreserved(text, dst)) {
                throw new Error(`${service.name} 译文丢失占位符`)
            }
            return dst
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
    // 展开为「文本 × 目标语言」任务列表；写入 messages 的键互不冲突，无需加锁
    type FreeTask = { question: string; to: TranslateTarget; toIso: string }
    const tasks: FreeTask[] = []
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
            tasks.push({ question, to, toIso })
        }
    }

    let consecutiveFailures = 0
    let tripped = false
    let processed = 0
    // 并发 worker 池：单线程事件循环下任务游标读取/推进无竞态
    let cursorIndex = 0
    // 简单互斥：5 个 worker 共享的"取任务 + 熔断判定"通过取号串行化
    // （JS 单线程下 `cursorIndex` 读写是原子的，关键字 await 之间不会被打断）
    const takeNext = (): FreeTask | null => {
        if (tripped) return null
        if (cursorIndex >= tasks.length) return null
        const t = tasks[cursorIndex]
        cursorIndex += 1
        return t
    }
    const worker = async (): Promise<void> => {
        for (;;) {
            const task = takeNext()
            if (!task) return
            processed += 1
            const dst = await translateWithFallback(task.question, fromIso, task.toIso)
            if (dst === null) {
                failedCount += 1
                consecutiveFailures += 1
                if (consecutiveFailures >= FAILURE_TRIP_LIMIT) {
                    tripped = true
                    // 只在阈值第一次跨越时打一次警告；并发 worker 共享计数器，
                    // 多个 worker 都可能在阈值处自检——只在严格等于阈值时打印避免重复
                    if (consecutiveFailures === FAILURE_TRIP_LIMIT) {
                        console.warn(
                            '免费翻译：免费服务连续失败已达上限，剩余文案本模块内直接跳过',
                        )
                    }
                    return
                }
                console.warn(`免费翻译：全部免费服务失败，跳过该条：${task.question}`)
                continue
            }
            consecutiveFailures = 0
            const key = translateHashKey(task.question)
            const item = messages[key]
            if (item) {
                item[task.to] = dst
            } else {
                messages[key] = {
                    [from]: task.question,
                    [task.to]: dst,
                } as Autoi18nMessageItem
            }
        }
    }
    await Promise.all(
        Array.from({ length: Math.min(FREE_CONCURRENCY, tasks.length) }, () => worker()),
    )
    // 熔断后未执行的记入失败计数
    failedCount += tasks.length - processed
    if (failedCount > 0) {
        console.warn(`免费翻译：共 ${failedCount} 条翻译失败已跳过`)
    }
    if (!Object.keys(messages).length) {
        console.warn('免费翻译：没有产生任何译文（MyMemory/Google 均不可用或文本被跳过）')
        return null
    }
    return messages
}

export default freeTranslate
