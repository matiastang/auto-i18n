/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/scriptScan.ts
 * @Description: SFC script 块零标记扫描——@babel/parser 定位字符串字面量（research.md R2）
 */
import { parse as babelParse } from '@babel/parser'
import { containsCjk } from './cjk'
import { collectFromBabelAst } from './babelCollect'
import { overlapsAny } from './walk'
import { IgnoreRange, ScanResult, ZeroMarkHit } from './types'

/**
 * 扫描 script 段源码中的零标记文案
 * @param code script 块内容
 * @param offset script 块内容在模块源码中的起始偏移（loc.start.offset）
 * @param ignoreRanges 忽略标记覆盖区间（模块源码级偏移）
 * @returns 命中（已过滤显式调用点、忽略标记与不含 CJK 者）与显式调用区间
 */
export const scanScript = (
    code: string,
    offset: number = 0,
    ignoreRanges: IgnoreRange[] = []
): ScanResult => {
    const hits: ZeroMarkHit[] = []
    const explicitRanges = []
    let program: unknown = null
    try {
        program = babelParse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
            errorRecovery: true,
        })
    } catch {
        // 解析失败安全回退：该模块不做零标记处理（显式管线照常），不中断构建
        return { hits, explicitRanges }
    }
    const collected = collectFromBabelAst(program, offset)
    explicitRanges.push(...collected.explicitRanges)
    for (const literal of collected.literals) {
        if (!containsCjk(literal.text)) {
            continue
        }
        if (overlapsAny(literal.start, literal.end, collected.explicitRanges)) {
            continue
        }
        // 被忽略标记覆盖者不产出命中（contracts C-3：不提取、不改写）
        if (overlapsAny(literal.start, literal.end, ignoreRanges)) {
            continue
        }
        hits.push({
            text: literal.text,
            kind: 'literal',
            start: literal.start,
            end: literal.end,
            source: 'script',
            ignored: false,
        })
    }
    return { hits, explicitRanges }
}
