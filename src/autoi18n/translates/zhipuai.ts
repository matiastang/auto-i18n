/*
 * @Author: matiastang
 * @Date: 2024-03-19 18:02:05
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:20:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/zhipuai.ts
 * @Description: 智谱AI模型翻译——智谱端点本身即 OpenAI Chat Completions 兼容格式，
 * 内部委托 shared 的通用客户端，仅预置服务地址与 glm-4 模型（公开签名与行为保持不变）
 */
import { Autoi18nMessages } from '../@types/autoi18n'
import { TranslateTarget } from '../@types/enum'
import { checkTranslateQuestions, chatCompletionsTranslate, translateMessage } from './shared'

// 智谱服务地址（OpenAI Chat Completions 兼容）
const zhipuai_base_url = 'https://open.bigmodel.cn/api/paas/v4'
// 智谱默认模型（可由调用方通过 model 参数覆盖）
export const DEFAULT_ZHIPUAI_MODEL = 'glm-4'

/**
 * 智谱翻译，过滤掉已经在缓存中的内容
 * @param apiKey 智谱 APIKEY
 * @param questions 待翻译文案
 * @param tos 目标语言
 * @param from 源语言
 * @param cache 翻译缓存
 * @param model 模型名（缺省 glm-4）
 * @returns 新增译文；无新增或失败返回 null
 */
export const zhipuaiTranslate = async (
    apiKey: string,
    questions: string[],
    tos: TranslateTarget[],
    from: TranslateTarget,
    cache?: Autoi18nMessages,
    model?: string,
): Promise<Autoi18nMessages | null> => {
    const translateTos = tos.filter((item) => item !== from)
    if (!questions.length || !translateTos.length) {
        return null
    }
    const nCacheQuestions = checkTranslateQuestions(cache || {}, questions, translateTos)
    if (!nCacheQuestions.length) {
        console.log('智谱翻译：全部命中缓存，无需翻译')
        return null
    }
    const res = await chatCompletionsTranslate(
        {
            apiKey,
            baseUrl: zhipuai_base_url,
            model: model || DEFAULT_ZHIPUAI_MODEL,
        },
        nCacheQuestions,
        translateTos,
        from,
    )
    if (!res.length) {
        return null
    }
    return translateMessage(res)
}

export default zhipuaiTranslate
