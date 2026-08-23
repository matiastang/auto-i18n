/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:11:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:11:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/shared.ts
 * @Description: 翻译源共享协议：LLM 批量提示词、<...> 提取、缓存过滤、结果折叠、
 *               OpenAI Chat Completions 兼容通用客户端（智谱/OpenAI/DeepSeek 等共用）
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

// few-shot 提示词：文本以 <...> 包裹、顿号连接、大括号占位符原样保留
const LLM_MESSAGES = [
    {
        role: 'system',
        content:
            '你只需要做翻译，需要翻译使用<>符号包裹的的内容，翻译的结果也使用<>包裹，大括号包裹的内容，无需翻译，直接输出在对应的位置就行。',
    },
    {
        role: 'user',
        content: '将：<你好，{name}>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<Hello, {name}>',
    },
    {
        role: 'user',
        content: '将：<你好，{name}>、<科技>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<Hello, {name}>、<technology>',
    },
    {
        role: 'user',
        content: '将：<科技>、<指数>、<经济>，翻译为英语。',
    },
    {
        role: 'assistant',
        content: '<technology>、<index>、<economy>',
    },
    {
        role: 'user',
        content: '将：<科技>、<指数>、<经济>，翻译为日语。',
    },
    {
        role: 'assistant',
        content: '<テクノロジー>、<指数>、<経済>、<スルー>',
    },
]

/**
 * 构造批量翻译请求文本：每条以 <...> 包裹并用顿号连接
 * @param texts 待翻译文本
 * @returns 批量请求文本；空列表返回空字符串
 */
export const buildTranslateQuestion = (texts: string[]): string => {
    return texts.map((item) => `<${item}>`).join('、')
}

/**
 * 提取 <...> 标签内的全部内容（保持顺序）
 * @param input 模型输出
 * @returns 标签内容数组；无标签返回空数组
 */
export const extractContentBetweenTags = (input: string): string[] => {
    const regex = /<([^>]*)>/g
    const matches = input.matchAll(regex)
    const result: string[] = []
    for (const match of matches) {
        result.push(match[1])
    }
    return result
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
            }).then((r) => r.json())
            const content = res?.choices?.[0]?.message?.content
            if (typeof content !== 'string' || !content) {
                console.warn(`模型返回内容异常（${to}），跳过`, res)
                continue
            }
            const resTexts = extractContentBetweenTags(content)
            if (resTexts.length !== texts.length) {
                console.warn(`模型返回条数（${resTexts.length}）与请求条数（${texts.length}）不符（${to}），跳过`)
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
