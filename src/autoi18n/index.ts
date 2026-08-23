/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 16:48:05
 * @FilePath: /auto-i18n/src/autoi18n/index.ts
 * @Description: autoi18n
 */
export * from './@types/enum'
export * from './utils/index'
import { autoi18n, autoi18nInfo, autoTranslate } from './autoi18n'
import { autoi18nPlugin } from './autoi18nPlugin'
import { freeTranslate } from './translates/free'
import { openaiTranslate } from './translates/openai'
import { zhipuaiTranslate } from './translates/zhipuai'
import { resolveTranslateFunction } from './translates/provider'

export {
    autoi18n,
    autoi18nInfo,
    autoTranslate,
    autoi18nPlugin,
    freeTranslate,
    openaiTranslate,
    zhipuaiTranslate,
    resolveTranslateFunction,
}
