/*
 * @Author: matiastang
 * @Date: 2023-07-14 10:13:05
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-21 14:42:30
 * @FilePath: /auto-i18n/src/autoi18n/type.d.ts
 * @Description: autoi18n
 */
import { TranslateTarget } from './enum'
export type Autoi18nMessageValue = string | number

// export type LocaleType = 'zh' | 'en' | 'jp' | 'ara' | 'fra'

// export interface Autoi18nMessageItem {
//     // TS1337: An index signature parameter type cannot be a literal type or generic type. Consider using a mapped object type instead.
//     [key: LocaleType]: Autoi18nMessageValue
// }

// export type Autoi18nMessageItem = {
//     [key in LocaleType]: Autoi18nMessageValue
// }

export type Autoi18nMessageItem = {
    [key: TranslateTarget]: Autoi18nMessageValue
}

export interface Autoi18nMessages {
    [key: string]: Autoi18nMessageItem
}

export interface Autoi18nOptions {
    filePath?: string
    locale: TranslateTarget
    locales: TranslateTarget[]
}

export interface Autoi18n extends Autoi18nOptions {
    messages: Autoi18nMessages
}

export type Autoi18nType = Autoi18n

export type Autoi18nTranslate = (key: string, options?: {[key: string]: string | number}) => Autoi18nMessageValue

export interface Autoi18nData extends Autoi18n {
    isTranslate?: Boolean
    isDev?: Boolean
}