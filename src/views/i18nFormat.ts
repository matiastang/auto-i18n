/*
 * @Author: matiastang
 * @Date: 2026-08-25 10:30:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-25 10:30:00
 * @FilePath: /auto-i18n/src/views/i18nFormat.ts
 * @Description: 带插值的运行时翻译辅助——独立 .ts 文件不经插件转换，直接使用运行时翻译函数。
 * 词条未命中时框架回退返回原文但不做占位符替换，这里统一补齐插值，
 * 保证"当前语言：{code}"这类动态文案在未收录时也能展示为"当前语言：zh"。
 */
import { autoTranslate } from 'auto-i18n-vue'

/**
 * 翻译并始终完成占位符插值（含回退原文场景）
 * @param key 中文文案（含 {name} 形式占位符）
 * @param options 占位符参数
 * @returns 翻译（或回退原文）并插值后的文本
 */
export const formatTranslate = (
    key: string,
    options?: { [key: string]: string | number }
) => {
    const text = autoTranslate(key, options)
    if (!options) {
        return String(text)
    }
    return Object.entries(options).reduce((left, item) => {
        const [name, value] = item
        return String(left).replaceAll(`{${name}}`, String(value))
    }, String(text))
}
