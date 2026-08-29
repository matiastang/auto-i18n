/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:11:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:11:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/shared.ts
 * @Description: 翻译源共享协议：LLM 批量提示词、<...> 提取、缓存过滤、结果折叠、
 *               OpenAI Chat Completions 兼容通用客户端（各兼容服务共用）
 */
import { translateHashKey, translateTargetText } from '../utils/translate'
import { Autoi18nMessages, Autoi18nMessageItem } from '../@types/autoi18n'
import { TranslateTarget } from '../@types/enum'

/**
 * 翻译返回内容格式
 */
export interface TransResultItem {
    src: string
    dst: string
}

export interface TranslateResult {
    from: TranslateTarget
    to: TranslateTarget
    trans_result: TransResultItem[]
}

/**
 * OpenAI Chat Completions 兼容接口配置
 */
export interface ChatCompletionsOptions {
    /**
     * 模型 APIKEY
     */
    apiKey: string
    /**
     * 服务地址（兼容 {baseUrl}/chat/completions 的任一服务商）
     */
    baseUrl: string
    /**
     * 模型名
     */
    model: string
}

// few-shot 提示词：文本以编号标签包裹、顿号连接、大括号占位符原样保留。
// 编号协议（<n>译文</n>）让解析按序号回填而非按出现位置对齐，
// 模型少返回/错位/乱序时都能被精确检测与定位，不会把 A 的译文记到 B 头上
const LLM_MESSAGES = [
    {
        role: 'system',
        content:
            '你只需要做翻译，需要翻译的内容使用形如<n>…</n>的编号标签包裹（n 为从 1 开始的序号）。每段内容单独一个标签，保留原有序号与格式依次输出；结果之间用顿号、连接。大括号包裹的内容无需翻译，直接输出在对应的位置。',
    },
    {
        role: 'user',
        content: '将：<1>你好，{name}</1>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<1>Hello, {name}</1>',
    },
    {
        role: 'user',
        content: '将：<1>你好，{name}</1>、<2>科技</2>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<1>Hello, {name}</1>、<2>technology</2>',
    },
    {
        role: 'user',
        content: '将：<1>科技</1>、<2>指数</2>、<3>经济</3>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<1>technology</1>、<2>index</2>、<3>economy</3>',
    },
    {
        role: 'user',
        content: '将：<1>科技</1>、<2>指数</2>、<3>经济</3>，翻译为日语。',
    },
    {
        role: 'assistant',
        content: '<1>テクノロジー</1>、<2>指数</2>、<3>経済</3>',
    },
]

// 单次翻译请求超时（毫秒）——翻译运行在构建 transform 钩子内，必须可超时退出
const REQUEST_TIMEOUT_MS = 10_000

/**
 * 构造批量翻译请求文本：每条以编号标签包裹并用顿号连接
 * @param texts 待翻译文本
 * @returns 批量请求文本；空列表返回空字符串
 */
export const buildTranslateQuestion = (texts: string[]): string => {
    return texts.map((item, index) => `<${index + 1}>${item}</${index + 1}>`).join('、')
}

/**
 * 按编号标签解析模型输出，返回与请求顺序对齐的译文数组
 * 编号协议下解析按序号回填而非按出现位置对齐——乱序输出会被检测而不是串位
 * @param input 模型输出
 * @param expectedCount 请求的文本条数
 * @returns 与请求对齐的译文；缺失序号/重复序号等结构异常时返回 null
 */
export const parseNumberedTranslations = (input: string, expectedCount: number): string[] | null => {
    const result: (string | undefined)[] = []
    for (const match of input.matchAll(/<(\d+)>([\s\S]*?)<\/\1>/g)) {
        const index = Number(match[1]) - 1
        if (index < 0 || index >= expectedCount || result[index] !== undefined) {
            return null
        }
        result[index] = match[2]
    }
    if (result.length !== expectedCount || result.some((item) => item === undefined)) {
        return null
    }
    return result as string[]
}

/**
 * 查找需要翻译的内容：过滤掉缓存中源语言与全部目标语言均已存在的文案
 * @param cache 翻译缓存
 * @param questions 待检查文案
 * @param tos 目标语言
 * @returns 仍需翻译的文案
 */
export const checkTranslateQuestions = (
    cache: Autoi18nMessages,
    questions: string[],
    tos: TranslateTarget[],
): string[] => {
    return questions.filter((item) => {
        const key = translateHashKey(item)
        const info = cache[key]
        if (!info) {
            return true
        }
        return tos.findIndex((to) => !info[to]) !== -1
    })
}

/**
 * 组合数据：把翻译结果折叠为翻译缓存结构（键=原文哈希、源语言回填、多目标合并）
 * @param data 翻译结果列表
 * @param cache 既有缓存（在其基础上叠加）
 * @returns 翻译缓存
 */
export const translateMessage = (data: TranslateResult[], cache?: Autoi18nMessages): Autoi18nMessages => {
    return data.reduce((msg, item) => {
        const { to, from, trans_result } = item
        for (let i = 0; i < trans_result.length; i++) {
            const { src, dst } = trans_result[i]
            if (typeof src !== 'string' || typeof dst !== 'string') {
                continue
            }
            const key = translateHashKey(src)
            const qMsg = msg[key]
            if (!qMsg) {
                msg[key] = {
                    [from]: src,
                    [to]: dst,
                } as Autoi18nMessageItem
                continue
            }
            qMsg[to] = dst
        }
        return msg
    }, cache || ({} as Autoi18nMessages))
}

/**
 * 提取文本中的插值占位符（{name} 形式）
 * @param text 文本
 * @returns 占位符数组（可能为空）
 */
export const extractPlaceholders = (text: string): string[] => {
    return text.match(/\{[^{}]+\}/g) || []
}

/**
 * 校验译文是否原样保留了原文的全部占位符（FR-006）
 * @param src 原文
 * @param dst 译文
 * @returns 全部保留返回 true
 */
export const placeholdersPreserved = (src: string, dst: string): boolean => {
    return extractPlaceholders(src).every((placeholder) => dst.includes(placeholder))
}

/**
 * 拼接 chat/completions 地址（末尾斜杠容错）
 * @param baseUrl 服务地址
 * @returns 完整请求地址
 */
export const chatCompletionsUrl = (baseUrl: string): string => {
    return `${baseUrl.replace(/\/+$/, '')}/chat/completions`
}

/**
 * OpenAI Chat Completions 兼容通用翻译客户端：逐目标语言请求、解析、条数校验
 * 任一目标失败（网络/鉴权/响应异常/条数不符）仅警告并跳过该目标，不中断
 * @param options 兼容接口配置（apiKey/baseUrl/model）
 * @param texts 待翻译文本
 * @param tos 目标语言
 * @param from 源语言
 * @returns 各目标的翻译结果列表（可能为空）
 */
export const chatCompletionsTranslate = async (
    options: ChatCompletionsOptions,
    texts: string[],
    tos: TranslateTarget[],
    from: TranslateTarget = TranslateTarget.ZH,
): Promise<TranslateResult[]> => {
    if (!texts.length) {
        console.warn('没有待翻译内容')
        return []
    }
    const translateTos = tos.filter((item) => item !== from)
    if (!translateTos.length) {
        console.warn('没有翻译目标')
        return []
    }
    const question = buildTranslateQuestion(texts)
    const translatesRes: TranslateResult[] = []
    for (const to of translateTos) {
        const target = translateTargetText(to)
        if (!target) {
            console.warn(`翻译目标 ${to} 没有对应描述，跳过`)
            continue
        }
        const body = {
            model: options.model,
            messages: [
                ...LLM_MESSAGES,
                {
                    role: 'user',
                    content: `将：${question}，翻译为${target}。`,
                },
            ],
        }
        const headers = {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${options.apiKey}`,
        }
        try {
            const res = await fetch(chatCompletionsUrl(options.baseUrl), {
                method: 'POST',
                body: JSON.stringify(body),
                headers,
                signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
            })
            if (!res.ok) {
                console.warn(`模型翻译 HTTP ${res.status}（${to}），跳过`)
                continue
            }
            const data = await res.json()
            const content = data?.choices?.[0]?.message?.content
            if (typeof content !== 'string' || !content) {
                console.warn(`模型返回内容异常（${to}），跳过`, data)
                continue
            }
            const resTexts = parseNumberedTranslations(content, texts.length)
            if (!resTexts) {
                console.warn(`模型返回编号标签结构异常（${to}），跳过`)
                continue
            }
            // 占位符（{name}）必须原样保留，任一丢失即丢弃该目标整批（FR-006）
            if (
                texts.some((text, index) => !placeholdersPreserved(text, resTexts[index]))
            ) {
                console.warn(`模型译文丢失占位符（${to}），跳过`)
                continue
            }
            translatesRes.push({
                from,
                to,
                trans_result: texts.map((item, index) => ({
                    src: item,
                    dst: resTexts[index],
                })),
            })
        } catch (error) {
            console.warn(`模型翻译请求失败（${to}），跳过`, error)
        }
    }
    return translatesRes
}
