/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/cjk.ts
 * @Description: 零标记文案判定——CJK 启发式（research.md R4 / contracts C-4）
 */

/**
 * CJK 判定：字符串内容含至少一个 CJK 统一表意字符（含扩展A）、日文假名或谚文音节。
 * 全角标点单独不构成判定依据——"含 CJK 字符"是文案判定的主要启发式，
 * 纯 ASCII（路由、事件名、className 等）天然排除。
 */
export const CJK_PATTERN = /[\u3400-\u4dbf\u4e00-\u9fff\u3040-\u30ff\uac00-\ud7af]/

/**
 * 判定字符串是否参与零标记翻译
 * @param text 字符串内容值
 */
export const containsCjk = (text: string): boolean => {
    return CJK_PATTERN.test(text)
}
