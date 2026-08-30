/*
 * @Author: matiastang
 * @Date: 2026-08-24 01:11:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-26 23:30:00
 * @FilePath: /auto-i18n/src/autoi18n/utils/language.ts
 * @Description: 语言代码映射
 * 语言元信息唯一来源：新增语言只需在此表登记
 */
import { TranslateTarget } from '../@types/enum'

/**
 * 内部语言元信息
 */
export interface LanguageMeta {
    /**
     * 目标语言描述（LLM 提示词用）
     */
    text: string
    /**
     * 三方翻译服务 ISO 639 语言代码；null 表示三方服务不支持该语言（调用方跳过并警告）
     */
    iso: string | null
}

/**
 * 语言元信息表：内部枚举值（jp/ara/fra）为历史命名不可变更，
 * 三方服务与 LLM 提示词统一从本表取描述/ISO 代码（此前 enum/描述/iso 三处各自维护，易漏改）
 */
export const LANGUAGE_META: Record<TranslateTarget, LanguageMeta> = {
    [TranslateTarget.ZH]: { text: '中文', iso: 'zh-CN' },
    [TranslateTarget.EN]: { text: '英语', iso: 'en' },
    [TranslateTarget.JP]: { text: '日语', iso: 'ja' },
    [TranslateTarget.ARA]: { text: '阿拉伯语', iso: 'ar' },
    [TranslateTarget.FRA]: { text: '法语', iso: 'fr' },
}

/**
 * 查询语言元信息；未知语言返回 null
 * @param target 内部语言枚举
 */
export const languageMetaOf = (target: TranslateTarget): LanguageMeta | null => {
    return LANGUAGE_META[target] ?? null
}

/**
 * 内部语言枚举 -> 三方翻译服务 ISO 语言代码
 * @param target 内部语言枚举
 * @returns ISO 语言代码；未知语言返回 null（调用方应跳过该目标并警告）
 */
export const toIsoLocale = (target: TranslateTarget): string | null => {
    return languageMetaOf(target)?.iso ?? null
}
