/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:20:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:20:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/openai.ts
 * @Description: OpenAI Chat Completions 兼容翻译源——覆盖所有提供该兼容接口的
 * 常见 LLM 服务（OpenAI、DeepSeek、Moonshot/Kimi、通义千问兼容模式、本地 Ollama 等），
 * 只需配置 apiKey + baseUrl + model
 */
import { AIModelConfig } from '../@types/autoi18nPlugin'
import { Autoi18nMessages } from '../@types/autoi18n'
import { TranslateTarget } from '../@types/enum'
import { checkTranslateQuestions, chatCompletionsTranslate, translateMessage } from './shared'

/**
 * 默认 OpenAI 服务地址
 */
export const DEFAULT_OPENAI_BASE_URL = 'https://api.openai.com/v1'
/**
 * 默认模型（未显式配置 model 时兜底；建议接入方显式配置）
 */
export const DEFAULT_OPENAI_MODEL = 'gpt-4o-mini'

/**
 * OpenAI 兼容翻译（TranslateFunction 契约的配置化实现）
 * @param config 模型配置（apiKey 必填；baseUrl/model 可选，有默认值）
 * @param questions 待翻译文案
 * @param tos 目标语言
 * @param from 源语言
 * @param cache 翻译缓存
 * @returns 新增译文；无新增或失败返回 null
 */
export const openaiTranslate = async (
    config: AIModelConfig,
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
        console.log('OpenAI 兼容翻译：全部命中缓存，无需翻译')
        return null
    }
    const results = await chatCompletionsTranslate(
        {
            apiKey: config.apiKey,
            baseUrl: config.baseUrl || DEFAULT_OPENAI_BASE_URL,
            model: config.model || DEFAULT_OPENAI_MODEL,
        },
        nQuestions,
        translateTos,
        from,
    )
    if (!results.length) {
        return null
    }
    return translateMessage(results)
}

export default openaiTranslate
