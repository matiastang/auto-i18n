/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-13 19:58:53
 * @FilePath: /auto-i18/src/autoi18/index.ts
 * @Description: Auto i18
 */
import { App, ref, reactive } from 'vue'

const locale = ref<string>('en')

const autoi18 = {
    install(app: App, options: any) {
        console.log(options)
        locale.value = options.locale
        app.provide('i18Locale', locale.value)
        const data = reactive({
            value: options.messages[locale.value]
        })
        const autoi18 = reactive({
            locale: options.locale
        })
        app.config.globalProperties.$autoi18 = autoi18
        app.config.globalProperties.$translate = (key) => {
            console.log(locale, key)
            return data.value[key]
            // 获取 `options` 对象的深层属性
            // 使用 `key` 作为索引
            // return key.split('.').reduce((o, i) => {
            //   if (o) return o[i]
            // }, options.messages[locale.value])
        }
        app.config.globalProperties.$changeLocale = (lca: 'en' | 'zh' | 'ja') => {
            console.log(lca)
            autoi18.locale = lca
            data.value = options.messages[lca]
        }
    }
}

export default autoi18