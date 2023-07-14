/*
 * @Author: matiastang
 * @Date: 2023-07-14 10:13:05
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-14 10:22:13
 * @FilePath: /auto-i18n/src/autoi18n/type.d.ts
 * @Description: autoi18n type
 */
export type I18nValue = string | number

export type I18nMessage = {
    [key: string]: I18nValue | I18nMessage
}

export interface Autoi18n {
    locale: string
    messages: I18nMessage
}

export type Autoi18nTranslate = (key: string) => I18nValue