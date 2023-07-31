/*
 * @Author: matiastang
 * @Date: 2023-07-21 16:05:35
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-31 19:38:29
 * @FilePath: /auto-i18n/src/autoi18n/autoi18n.ts
 * @Description: autoi18n
 */
import { App, reactive } from 'vue'
import { Autoi18nOptions, Autoi18n, Autoi18nMessageItem, Autoi18nMessageValue } from './type'
import { translateHashKey, readJsonFile } from './utils'

export const autoi18nInfo = reactive<Autoi18n>({
    locale: 'zh',
    locales: ['zh', 'en'],
    messages: {}
})

export const autoTranslate = (key: string, options?: {[key: string]: string | number}) => {
    const locale = autoi18nInfo.locale
    const localeKey = translateHashKey(key, true)
    const item = autoi18nInfo.messages[localeKey] as Autoi18nMessageItem
    console.log(localeKey, item)
    if (!item) {
        return key
    }
    const value = item[locale] as Autoi18nMessageValue
    if (!value) {
        return key
    }
    if (options) {
        return Object.entries(options).reduce((left, item) => {
            const [_key, _val] = item
            return String(left).replaceAll('{' + _key + '}', `${_val}`)
        }, value)
    }
    return value
}

const autoi18n = {
    async install(app: App, options: Autoi18nOptions) {
        const optionLocal = options.locale
        if (optionLocal) {
            autoi18nInfo.locale = optionLocal
        }
        const optionLocals = options.locales
        if (optionLocals) {
            autoi18nInfo.locales = optionLocals
        }
        const filePath = options.filePath
        readJsonFile(filePath).then((res) => {
            console.log('translate.json', res)
            autoi18nInfo.messages = res
        }).catch((err) => {
            console.warn(err)
        })
        app.provide('$autoi18n', autoi18nInfo)
        app.config.globalProperties.$autoi18n = autoi18nInfo
        app.provide('$translate', autoTranslate)
        app.config.globalProperties.$translate = autoTranslate
    }
}

export default autoi18n