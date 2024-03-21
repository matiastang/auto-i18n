/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-21 14:42:02
 * @FilePath: /auto-i18n/src/autoi18n/index.ts
 * @Description: autoi18n
 */
import autoi18n, { autoi18nInfo, autoTranslate } from './autoi18n'
import autoi18nPlugin from './autoi18nPlugin'
import { translateHashKey } from './utils'
export * from './enum'

export {
    autoi18n,
    autoi18nInfo,
    autoTranslate,
    autoi18nPlugin,
    translateHashKey,
}