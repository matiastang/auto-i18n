/*
 * @Author: matiastang
 * @Date: 2024-08-15 15:46:08
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 18:04:55
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
     * 地址（OPENAI 模式下为任一 OpenAI 兼容服务地址）
     */
    baseUrl?: string
    /**
     * 模型名（必填有效值，缺失时回退免费翻译）
     */
    model?: string
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
     * 是否dev环境
     */
    isDev?: boolean,
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
     * 零标记扫描总开关（默认 true）
     * 开启时自动发现 .vue 中含 CJK 的字符串文案并改写翻译；
     * 设为 false 时插件行为等价 v0.1.0（仅显式 $translate/autoTranslate 管线）
     */
    autoScan?: boolean,
    /**
     * 零标记扫描排除规则（字符串为模块 id/路径的包含匹配；RegExp 为 test 匹配）
     * 命中任一规则的文件跳过零标记扫描（显式管线不受影响）
     */
    exclude?: (string | RegExp)[],
    /**
     * 获取已翻译的内容
     * @returns
     */
    readTranslateContent: () => Promise<Autoi18nMessages>,
    /**
     * 保存已翻译的内容
     * @param data
     * @returns
     */
    saveTranslateContent: (data: Autoi18nMessages) => Promise<boolean>,
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
     * 是否翻译
     */
    isTranslate?: boolean
    /**
     * 是否dev环境
     */
    isDev?: boolean
    /**
     * 零标记扫描是否开启
     */
    autoScan?: boolean
    /**
     * 零标记扫描排除规则（FR-007）
     */
    exclude?: (string | RegExp)[]
}