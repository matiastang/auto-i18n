/*
 * @Author: matiastang
 * @Date: 2023-07-21 16:05:35
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 14:47:34
 * @FilePath: /auto-i18n/src/autoi18n/autoi18n.ts
 * @Description: autoi18n
 */
import { App, reactive } from 'vue'
import { TranslateTarget } from './@types/enum'
import { Autoi18nConfig, Autoi18nInfo, Autoi18nMessageItem, Autoi18nMessageValue } from './@types/autoi18n'
import { translateHashKey, readJsonFile } from './utils'

/**
 * autoi18n信息
 */
export const autoi18nInfo = reactive<Autoi18nInfo>({
    /**
     * 当前语言
     */
    locale: TranslateTarget.ZH,
    /**
     * 目标语言
     */
    targets: [TranslateTarget.ZH, TranslateTarget.EN],
    /**
     * 翻译信息
     */
    messages: {}
})

/**
 * 自动转换
 * @param key 
 * @param options 
 * @returns 
 */
export const autoTranslate = (key: string, options?: {[key: string]: string | number}) => {
    const locale = autoi18nInfo.locale
    const localeKey = translateHashKey(key)
    const item = autoi18nInfo.messages[localeKey] as Autoi18nMessageItem
    if (!item) {
        console.info(key, localeKey, '未获取到翻译信息')
        return key
    }
    const value = item[locale] as Autoi18nMessageValue
    if (!value) {
        console.info(key, localeKey, `未获取到当前目标(${locale})翻译`)
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

/**
 * autoi18n插件
 */
export const autoi18n = {
    /**
     * 初始化加载
     * @param app 
     * @param options 
     */
    async install(app: App, options: Autoi18nConfig) {
        console.info('autoi18n插件初始化')
        const optionLocal = options.locale
        if (optionLocal) {
            autoi18nInfo.locale = optionLocal
        }
        const optionTargets = options.targets
        if (optionTargets && optionTargets.length > 0) {
            if (optionTargets.includes(autoi18nInfo.locale)) {
                autoi18nInfo.targets = optionTargets
            } else {
                console.warn('当前目标语言未包含在目标语言列表中')
                autoi18nInfo.targets = [autoi18nInfo.locale, ...optionTargets]
            }
        }
        const filePath = options.filePath
        if (filePath && filePath.endsWith('.json')) {
            // try {
            //     const messages = await readJsonFile(filePath)
            //     autoi18nInfo.messages = messages
            // } catch (error) {
            //     console.warn(error)
            // }
            readJsonFile(filePath).then((res) => {
                autoi18nInfo.messages = res
            }).catch((err) => {
                console.warn(err)
            })
        }
        console.log('init')
        app.provide('$autoi18n', autoi18nInfo)
        app.config.globalProperties.$autoi18n = autoi18nInfo
        app.provide('$translate', autoTranslate)
        app.config.globalProperties.$translate = autoTranslate
    }
}