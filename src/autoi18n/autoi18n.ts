/*
 * @Author: matiastang
 * @Date: 2023-07-21 16:05:35
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-21 16:07:09
 * @FilePath: /auto-i18n/src/autoi18n/autoi18n.ts
 * @Description: autoi18n
 */
import { App, reactive } from 'vue'
import { LocaleType, Autoi18nOptions, Autoi18n } from './type'

export let autoi18nLocals: LocaleType[] = []

const autoi18n = {
    install(app: App, options: Autoi18nOptions) {
        autoi18nLocals = options.locales
        const autoi18nInfo = reactive<Autoi18n>({
            ...options,
            messages: {}
        })
        app.provide('$autoi18n', autoi18nInfo)
        app.config.globalProperties.$autoi18n = autoi18nInfo
        app.config.globalProperties.$translate = (key: string) => {
            const values = autoi18nInfo.messages[autoi18nInfo.locale]
            if (!values) {
                return key
            }
            const value = values[key]
            if (value) {
                return value
            }
            return key
        }
    }
}

export default autoi18n