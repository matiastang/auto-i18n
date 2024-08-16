/*
 * @Author: matiastang
 * @Date: 2023-07-24 15:04:08
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-16 17:00:15
 * @FilePath: /auto-i18n/src/autoi18n/utils/translate.ts
 * @Description: utils
 */
import CryptoJS from 'crypto-js'
import { TranslateTarget } from '../@types/enum'
import { Autoi18nMessages, Autoi18nMessageItem } from '../@types/autoi18n'

/**
 * 目标语言描述
 * @param to 
 * @returns 
 */
export const translateTargetText = (to: TranslateTarget): string | null => {
    switch (to) {
        case TranslateTarget.ZH:
            return '中文'
        case TranslateTarget.EN:
            return '英语'
        case TranslateTarget.JP:
            return '日语'
        case TranslateTarget.ARA:
            return '阿拉伯语'
        case TranslateTarget.FRA:
            return '法语'
        default:
            return null
    }
}

/**
 * 提取翻译转换
 * @param code 
 * @returns 
 */
export const detectionTranslateMsg = (code: string): string[] => {
    // TODO: - 正则合并及精准匹配
    const msgs: string[] = []
    const RE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?\)/g
    const reTranslates = code.match(RE)
    if (Array.isArray(reTranslates) && reTranslates.length > 0) {
        msgs.push(...reTranslates.map((item) => item)) 
    }
    const optionRE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g
    const optionReTranslates = code.match(optionRE)
    if (Array.isArray(optionReTranslates) && optionReTranslates.length > 0) {
        msgs.push(...optionReTranslates.map((item) => item))
    }
    const autoReTranslates = code.match(/autoTranslate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?\)/g)
    if (Array.isArray(autoReTranslates) && autoReTranslates.length > 0) {
        msgs.push(...autoReTranslates.map((item) => item)) 
    }
    const autoOptionReTranslates = code.match(/autoTranslate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g)
    if (Array.isArray(autoOptionReTranslates) && autoOptionReTranslates.length > 0) {
        msgs.push(...autoOptionReTranslates.map((item) => item))
    }
    console.log(reTranslates, optionReTranslates, msgs)
    return msgs
}

/**
 * 提取翻译文本
 * @param tText 
 * @returns 
 */
export const detectionTranslateText = (msg: string): string | null => {
    const textRE = /\$translate\([\`'"](.*)[\`'"].*/g
    const textRes = textRE.exec(msg)
    if (!Array.isArray(textRes) || textRes.length <= 1) {
        console.log(`${msg} not extract text`)
        const autoTextRE = /autoTranslate\([\`'"](.*)[\`'"].*/g
        const autoTextRes = autoTextRE.exec(msg)
        if (!Array.isArray(autoTextRes) || autoTextRes.length <= 1) {
            console.log(`${msg} not extract text`)
            return null
        }
        return autoTextRes[1]
    }
    console.log(`${msg} extract: ${textRes[1]}`)
    return textRes[1]
}

/**
 * 提取翻译key
 * @param tText 
 * @returns 
 */
export const translateHashKey = (tText: string, prefix: string = 'autoi18n'): string => {
    const hash = CryptoJS.MD5(tText).toString()
    if (prefix) {
        return `${prefix}_${hash}`
    }
    return `${hash}`
}


/**
 * 检查key
 * @param code 
 * @returns 
 */
export const checkQuestions = (code: string) => {
    const translates = detectionTranslateMsg(code)
    if (!Array.isArray(translates) || translates.length <= 0) {
        return []
    }
    const questions = translates.map((item) => {
        const text = detectionTranslateText(item)
        if (!text) {
            return null
        }
        return text
    }).filter((item) => item)
    console.log('--------')
    console.log(questions)
    return questions
}

/**
 * 转换映射内容
 * @param msg 
 */
export const devTransformMessages = (msg: Autoi18nMessages) => {
    const localTransform = (info: Autoi18nMessageItem) => {
        return Object.entries(info).reduce((left, item) => {
            const [key, value] = item
            return left + `    ${key}: '${value}',\n`
        }, '{\n') + '  },\n'
    }
    return Object.entries(msg).reduce((left, item) => {
        const [key, value] = item
        return left + `  ${key}: ${localTransform(value)}`
    }, '{\n') + '}\n'
}

/**
 * 注入
 * @param code 
 * @param msg 
 */
export const devInjectMessages = (code: string, msg: string) => {
    return code.replace(/(\<script.*\>)/, `$1\n${msg}\n`)
}

/**
 * 转换方法替换
 * @param code 
 * @returns 
 */
export const devTransformMethod = (code: string) => {
    return code.replace(/\$translate/g, '_localeTranslate').replace(/autoTranslate\(/g, '_localeTranslate(')
}

// const test = () => {
//     const code = `$translate(\`基金圈：{name}\`, {
//         name: orgName
//     })`
//     const optionRE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g
//     const optionReTranslates = code.match(optionRE)
//     console.log(optionReTranslates)
// }
// test()

// console.log(detectionTranslateText('$translate(`基金圈：{name}`'))