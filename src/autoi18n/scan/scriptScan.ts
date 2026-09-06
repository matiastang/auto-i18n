/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/scriptScan.ts
 * @Description: SFC script 块零标记扫描——@babel/parser 定位字符串字面量（research.md R2）
 */
import { parse as babelParse } from '@babel/parser'
import { containsCjk } from './cjk'
import { collectFromBabelAst } from './babelCollect'
import { overlapsAny } from './walk'
import { ExplicitCallRange, IgnoreRange, ScanResult, ZeroMarkHit } from './types'

/**
 * 扫描 script 段源码中的零标记文案
 * @param code script 块内容
 * @param offset script 块内容在模块源码中的起始偏移（loc.start.offset）
 * @param ignoreMarks 忽略标记注释区间（与 code 同坐标系）——每个标记覆盖紧随其后的
 *                    一个语句（contracts C-3），扫描器内部解析为语句覆盖区间
 * @returns 命中（已过滤显式调用点、忽略覆盖与不含 CJK 者）与显式调用区间
 */
export const scanScript = (
    code: string,
    offset: number = 0,
    ignoreMarks: IgnoreRange[] = []
): ScanResult => {
    const hits: ZeroMarkHit[] = []
    const explicitRanges: ExplicitCallRange[] = []
    let program: { body?: unknown[] } | null = null
    try {
        program = babelParse(code, {
            sourceType: 'module',
            plugins: ['typescript'],
            errorRecovery: true,
        }) as { body?: unknown[] }
    } catch {
        // 解析失败安全回退：该模块不做零标记处理（显式管线照常），不中断构建
        return { hits, explicitRanges }
    }
    const collected = collectFromBabelAst(program, offset)
    explicitRanges.push(...collected.explicitRanges)
    // 忽略标记 → 覆盖区间：取标记之后最近的顶层语句（模块级偏移）
    const coveredRanges: { start: number; end: number }[] = []
    // babel parse 返回 File 节点，顶层语句在 file.program.body
    const file = program as { type?: string; program?: { body?: unknown[] }; body?: unknown[] } | null
    const statements = ((file?.type === 'File' ? file.program?.body : file?.body) ?? []) as {
        start?: number
        end?: number
    }[]
    for (const mark of ignoreMarks) {
        const statement = statements
            .filter((stmt) => typeof stmt.start === 'number' && (stmt.start as number) + offset >= mark.end)
            .sort((left, right) => (left.start as number) - (right.start as number))[0]
        if (statement) {
            coveredRanges.push({
                start: (statement.start as number) + offset,
                end: (statement.end as number) + offset,
            })
        }
    }
    for (const literal of collected.literals) {
        if (!containsCjk(literal.text)) {
            continue
        }
        if (overlapsAny(literal.start, literal.end, collected.explicitRanges)) {
            continue
        }
        // 被忽略标记覆盖者不产出命中（contracts C-3：不提取、不改写）
        if (overlapsAny(literal.start, literal.end, coveredRanges)) {
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
