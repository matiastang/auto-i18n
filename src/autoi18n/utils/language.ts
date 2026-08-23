/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:11:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-24 01:11:00
 * @FilePath: /auto-i18n/src/autoi18n/utils/language.ts
 * @Description: 语言代码映射
 */
import { TranslateTarget } from '../@types/enum'

/**
 * 内部语言枚举 -> 三方翻译服务 ISO 语言代码
 * 内部枚举值（jp/ara/fra）为历史命名不可变更，三方服务要求 ISO 639 代码
 * @param target 内部语言枚举
 * @returns ISO 语言代码；未知语言返回 null（调用方应跳过该目标并警告）
 */
export const toIsoLocale = (target: TranslateTarget): string | null => {
    switch (target) {
        case TranslateTarget.ZH:
            return 'zh-CN'
        case TranslateTarget.EN:
            return 'en'
        case TranslateTarget.JP:
            return 'ja'
        case TranslateTarget.ARA:
            return 'ar'
        case TranslateTarget.FRA:
            return 'fr'
        default:
            return null
    }
}
