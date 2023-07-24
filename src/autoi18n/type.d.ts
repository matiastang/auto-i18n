/*
 * @Author: matiastang
 * @Date: 2023-07-14 10:13:05
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-24 11:01:19
 * @FilePath: /auto-i18n/src/autoi18n/type.d.ts
 * @Description: autoi18n
 */
export type Autoi18nMessageValue = string | number

export type LocaleType = 'zh' | 'en' | 'jp'

export interface Autoi18nMessageItem {
    [key: LocaleType]: Autoi18nMessageValue
}

export interface Autoi18nMessages {
    [key: string]: Autoi18nMessageItem
}

export interface Autoi18nOptions {
    locale: LocaleType
    locales: LocaleType[]
}

export interface Autoi18n extends Autoi18nOptions {
    messages: Autoi18nMessages
}

export type Autoi18nTranslate = (key: string) => Autoi18nMessageValue
