/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-17 16:01:38
 * @FilePath: /auto-i18n/src/autoi18n/index.ts
 * @Description: autoi18n
 */
import { App, reactive } from 'vue'
import { Autoi18n } from './type'

const autoi18 = {
    install(app: App, options: any) {
        console.log(options)
        const autoi18n = reactive<Autoi18n>({
            locale: options.locale,
            messages: options.messages,
        })
        app.provide('$autoi18n', autoi18n)
        app.config.globalProperties.$autoi18n = autoi18n
        app.config.globalProperties.$translate = (key: string) => {
            // return key.split('.').reduce((o, i) => {
            //   if (o) return o[i]
            // }, autoi18n.messages[autoi18n.locale])
            const value = autoi18n.messages[autoi18n.locale][key]
            if (value) {
                return value
            }
            return key
        }
    }
}

export default autoi18