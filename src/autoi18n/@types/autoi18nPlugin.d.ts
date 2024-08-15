/*
 * @Author: matiastang
 * @Date: 2024-08-15 15:46:08
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 17:17:41
 * @FilePath: /auto-i18n/src/autoi18n/@types/autoi18nPlugin.d.ts
 * @Description: 插件相关类型
 */
import { TranslateTarget, TranslateAIModel } from './enum'
import { Autoi18nMessages, Autoi18nInfo } from './autoi18n'

/**
 * 模型配置
 */
export interface AIModelConfig {
    /**
     * 模型APIKEY
     */
    apiKey: string
    /**
     * 地址
     */
    baseUrl?: string
}

/**
 * 模型转换配置
 */
export interface TranslateAIModelConfig {
    /**
     * 模型
     */
    model: TranslateAIModel,
    /**
     * 模型配置
     */
    config: AIModelConfig,
}

/**
 * 转换函数
 */
export type TranslateFunction = (
    questions: string[],
    tos: TranslateTarget[],
    from: TranslateTarget,
    cache?: Autoi18nMessages,
) => Promise<Autoi18nMessages | null>

/**
 * autoi18n插件配置
 */
export interface Autoi18nPluginConfig {
    /**
     * 翻译读取保存文件路径
     */
    filePath?: string,
    /**
     * 是否dev环境
     */
    isDev?: Boolean,
    /**
     * 本地语言
     */
    locale?: TranslateTarget,
    /**
     * 目标语言
     */
    targets?: TranslateTarget[],
    /**
     * AI模型配置
     * 如果未设置translate，则使用该模型进行翻译
     */
    aiModelConfig?: TranslateAIModelConfig,
    /**
     * 转换函数
     * 如果存在，则使用该函数进行转换
     */
    translate?: TranslateFunction,
}

/**
 * autoi18n插件信息
 */
export interface Autoi18nPluginInfo extends Autoi18nInfo {
    /**
     * 翻译保存文件路径
     */
    filePath?: string,
    /**
     * 是否翻译
     */
    isTranslate?: Boolean
    /**
     * 是否dev环境
     */
    isDev?: Boolean
}