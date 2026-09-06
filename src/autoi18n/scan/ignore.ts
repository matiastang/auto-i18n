/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/ignore.ts
 * @Description: 注释级忽略标记的位置识别（contracts C-3）
 *  仅负责"找到标记注释在源码中的区间"；标记覆盖哪个语句/元素由各扫描器
 *  结合自身 AST 判定（scriptScan / templateScan）。
 *  局限说明：script 段标记出现在字符串字面量内会被误认——后果是误忽略相邻语句，
 *  失败方向为"少翻译不破坏"，可接受。
 */

/**
 * 忽略标记文本（script 与模板共用同一标记词，大小写敏感）
 */
export const SCRIPT_IGNORE_MARK = 'autoi18n-ignore'
export const TEMPLATE_IGNORE_MARK = 'autoi18n-ignore'

/**
 * 忽略标记覆盖区间
 */
export interface IgnoreRange {
    start: number
    end: number
}

/**
 * script 段块注释标记：/* autoi18n-ignore *​/（注释内允许空白）
 */
const SCRIPT_MARK_RE = /\/\*\s*autoi18n-ignore\s*\*\//g

/**
 * 模板段 HTML 注释标记：<!-- autoi18n-ignore -->（注释内允许空白）
 */
const TEMPLATE_MARK_RE = /<!--\s*autoi18n-ignore\s*-->/g

const collectMarks = (source: string, re: RegExp): IgnoreRange[] => {
    const ranges: IgnoreRange[] = []
    re.lastIndex = 0
    let match = re.exec(source)
    while (match) {
        ranges.push({ start: match.index, end: match.index + match[0].length })
        match = re.exec(source)
    }
    return ranges
}

/**
 * 识别 script 源码中的忽略标记注释区间
 * @param code script 段源码
 */
export const findScriptIgnoreMarks = (code: string): IgnoreRange[] => {
    return collectMarks(code, SCRIPT_MARK_RE)
}

/**
 * 识别模板源码中的忽略标记注释区间
 * @param source 模板段源码
 */
export const findTemplateIgnoreMarks = (source: string): IgnoreRange[] => {
    return collectMarks(source, TEMPLATE_MARK_RE)
}
