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
import { languageMetaOf } from './language'

/**
 * 目标语言描述
 * @param to
 * @returns
 */
export const translateTargetText = (to: TranslateTarget): string | null => {
    return languageMetaOf(to)?.text ?? null
}

/**
 * 字符串实参片段：按定界符闭合匹配（'..' / ".." / `..`，模板字符串可跨行），
 * 每种定界符捕获内容为独立分组（提取时取第一个非 undefined 分组）
 * 贪婪 (.*) 会把同一行多个调用合并成一条文本（如模板中相邻的两个插值），
 * 也会吞掉定界符内的异类引号（"It's"），必须按定界符精确闭合
 */
const STRING_ARG = `(?:'([^']*)'|"([^"]*)"|\`([^\`]*)\`)`

/**
 * 提取翻译转换
 * @param code
 * @returns
 */
export const detectionTranslateMsg = (code: string): string[] => {
    const RE = new RegExp(`(?:\\$translate|autoTranslate)\\([\\s\\n.]?${STRING_ARG}[\\s\\n.]?[,)]`, 'g')
    const matched = code.match(RE)
    return Array.isArray(matched) ? matched : []
}

/**
 * 提取翻译文本
 * @param tText
 * @returns
 */
export const detectionTranslateText = (msg: string): string | null => {
    const textRE = new RegExp(`(?:\\$translate|autoTranslate)\\([\\s\\n.]?${STRING_ARG}`)
    const textRes = textRE.exec(msg)
    if (!Array.isArray(textRes) || textRes.length <= 3) {
        return null
    }
    return textRes[1] ?? textRes[2] ?? textRes[3] ?? ''
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
 * 值经 JSON.stringify 转义——译文可能含单引号/双引号/换行（如 MyMemory 译出的 It's），
 * 裸拼接会生成非法 JS 导致开发期注入代码语法错误、构建中断
 * @param msg
 */
export const devTransformMessages = (msg: Autoi18nMessages) => {
    const localTransform = (info: Autoi18nMessageItem) => {
        return Object.entries(info).reduce((left, item) => {
            const [key, value] = item
            return left + `    ${JSON.stringify(key)}: ${JSON.stringify(value)},\n`
        }, '{\n') + '  },\n'
    }
    return Object.entries(msg).reduce((left, item) => {
        const [key, value] = item
        return left + `  ${JSON.stringify(key)}: ${localTransform(value)}`
    }, '{\n') + '}\n'
}

/**
 * 注入
 * @param code
 * @param msg
 */
export const devInjectMessages = (code: string, msg: string) => {
    if (!/<script[^>]*>/.test(code)) {
        // 只有 <template> 的 SFC：追加一个 setup 脚本块承载注入代码。
        // 若直接跳过注入，模板中的调用已被替换成 _localeTranslate( 而无定义，运行时 ReferenceError
        return `${code}\n<script setup>\n${msg}\n</script>\n`
    }
    return code.replace(/(\<script.*\>)/, `$1\n${msg}\n`)
}

/**
 * 转换方法替换：仅替换"调用点"（紧跟 "("），且要求前一个非空字符不是标识符字符
 * ——避免把属性键（{ autoTranslate: ... }）、普通单词（xxx$translate）误改成调用。
 *
 * 注意：不做字符串/注释/正则字面量识别，因为 Vue SFC 的 <template> 段里
 * 既包含 Vue 模板插值（`{{ $translate(\`…\`) }}`）也包含 HTML 属性值，
 * JS 词法层无法可靠识别哪些 `\`` 是字符串边界、哪些是 Vue 模板语法——
 * 单纯"跳过字符串"的策略会破坏模板内的调用点替换。
 *
 * 当前策略：调用点必须是 `$translate(` 或 `autoTranslate(`，且前一个非空
 * 字符不在 [A-Za-z0-9_$]（标识符字符）——这条规则足以排除"作为标识符一部分"
 * 与"作为属性键"两种误伤场景。
 */
export const devTransformMethod = (code: string) => {
    let out = ''
    const n = code.length
    let prevNonSpace = ''
    for (let i = 0; i < n; i += 1) {
        const c = code[i]
        // $translate(  →  _localeTranslate(
        if (c === '$' && code.startsWith('$translate(', i)) {
            // 单词边界：$translate 的 $ 之前不能是标识符字符
            if (prevNonSpace === '' || !isWordChar(prevNonSpace)) {
                out += '_localeTranslate('
                // 跳过 '$translate(' 共 11 字符
                i += 10
                prevNonSpace = '('
                continue
            }
        }
        // autoTranslate(  →  _localeTranslate(
        if (c === 'a' && code.startsWith('autoTranslate(', i)) {
            if (prevNonSpace === '' || !isWordChar(prevNonSpace)) {
                out += '_localeTranslate('
                i += 13
                prevNonSpace = '('
                continue
            }
        }
        out += c
        if (c !== ' ' && c !== '\t' && c !== '\n' && c !== '\r') {
            prevNonSpace = c
        }
    }
    return out
}

const isWordChar = (ch: string): boolean => {
    return /[A-Za-z0-9_$]/.test(ch)
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