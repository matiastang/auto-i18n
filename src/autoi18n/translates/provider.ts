/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:16:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:16:00
 * @FilePath: /auto-i18n/src/autoi18n/translates/provider.ts
 * @Description: 翻译源统一调度——按固定优先级解析出 TranslateFunction：
 * 自定义 translate > LLM（aiModelConfig 有效）> 免费三方翻译（默认）
 */
import { Autoi18nPluginConfig, TranslateFunction } from '../@types/autoi18nPlugin'
import { TranslateTarget, TranslateAIModel } from '../@types/enum'
import { Autoi18nMessages } from '../@types/autoi18n'
import zhipuaiTranslate from './zhipuai'
import { freeTranslate } from './free'

// 免费翻译默认行为提示只打印一次（transform 每个模块都会触发解析）
let freeDefaultNotified = false

/**
 * 按优先级解析翻译函数
 * @param config 插件配置
 * @returns 翻译函数（永不返回 null；无有效配置时返回免费翻译）
 */
export const resolveTranslateFunction = (config: Autoi18nPluginConfig): TranslateFunction => {
    // ① 自定义翻译函数（最高优先级）
    const customTranslate = config.translate
    if (customTranslate) {
        return customTranslate
    }
    // ② LLM（API Key 配置）
    const modelConfig = config.aiModelConfig
    if (modelConfig) {
        const aiConfig = modelConfig.config
        if (modelConfig.model === TranslateAIModel.ZHIPUAI && aiConfig?.apiKey) {
            return async (
                questions: string[],
                tos: TranslateTarget[],
                from: TranslateTarget,
                cache?: Autoi18nMessages,
            ) => {
                return await zhipuaiTranslate(aiConfig.apiKey, questions, tos, from, cache)
            }
        }
        console.warn(
            `autoi18n：aiModelConfig 无效（model=${String(modelConfig.model)}，apiKey=${
                aiConfig?.apiKey ? '已配置' : '缺失'
            }），回退免费三方翻译`,
        )
    }
    // ③ 免费三方翻译（默认行为，零配置）
    if (!freeDefaultNotified) {
        console.info('[autoi18n] 未配置翻译源，已默认使用免费三方翻译（MyMemory/Google 免费接口）')
        freeDefaultNotified = true
    }
    return freeTranslate
}
