/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 18:27:26
 * @FilePath: /auto-i18n/src/autoi18n/index.ts
 * @Description: autoi18n
 */
export * from './@types/enum'
import { translateHashKey } from './utils/translate'
import autoi18n, { autoi18nInfo, autoTranslate } from './autoi18n'
import autoi18nPlugin from './autoi18nPlugin'

export {
    autoi18n,
    autoi18nInfo,
    autoTranslate,
    autoi18nPlugin,
    translateHashKey,
}