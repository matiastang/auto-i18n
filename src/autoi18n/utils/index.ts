/*
 * @Author: matiastang
 * @Date: 2023-07-24 15:04:08
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-28 17:09:11
 * @FilePath: /auto-i18n/src/autoi18n/utils/index.ts
 * @Description: utils
 */
import CryptoJS from 'crypto-js'
import { Autoi18nMessages, Autoi18nMessageItem } from '../type'
export * from './file'

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
        return null
    }
    console.log(`${msg} extract: ${textRes[1]}`)
    return textRes[1]
}

/**
 * 提取翻译key
 * @param tText 
 * @returns 
 */
export const translateHashKey = (tText: string, isJson: Boolean = false): string => {
    const hash = CryptoJS.MD5(tText).toString()
    // if (isJson) {
    //     return `'${hash}'`
    // }
    return `autoi18n${hash}`
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
    return code.replace(/\$translate/g, '_localeTranslate')
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