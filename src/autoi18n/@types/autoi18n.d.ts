/*
 * @Author: matiastang
 * @Date: 2023-07-14 10:13:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 17:06:21
 * @FilePath: /auto-i18n/src/autoi18n/@types/autoi18n.d.ts
 * @Description: autoi18n
 */
import { TranslateTarget } from './enum'

// 翻译值类型
export type Autoi18nMessageValue = string | number

/**
 * 翻译项
 */
export type Autoi18nMessageItem = {
    // TS1337: An index signature parameter type cannot be a literal type or generic type. Consider using a mapped object type instead.
    // [key: TranslateTarget]: Autoi18nMessageValue
    [key in TranslateTarget]: Autoi18nMessageValue
}

/**
 * 翻译信息
 */
export interface Autoi18nMessages {
    [key: string]: Autoi18nMessageItem
}

/**
 * 翻译目标
 */
export interface Autoi18nTarget {
    /**
     * 本地语言
     */
    locale?: TranslateTarget,
    /**
     * 目标语言
     */
    targets?: TranslateTarget[],
}

/**
 * 翻译目标
 */
export type Autoi18nRequiredTarget = Required<Autoi18nTarget>

/**
 * autoi18n配置项
 */
export interface Autoi18nConfig extends Autoi18nTarget {
    /**
     * 翻译读取保存文件路径
     */
    filePath?: string,
}

/**
 * autoi18n信息
 */
export interface Autoi18nInfo extends Autoi18nRequiredTarget {
    /**
     * 翻译信息
     */
    messages: Autoi18nMessages
}

/**
 * autoi18n
 */
export type Autoi18nType = Autoi18nInfo

/**
 * 转换函数
 */
export type Autoi18nTranslate = (key: string, options?: {[key: string]: string | number}) => Autoi18nMessageValue