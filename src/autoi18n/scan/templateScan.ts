/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/templateScan.ts
 * @Description: SFC 模板块零标记扫描——@vue/compiler-sfc 模板 AST（research.md R1）
 *  文本节点整段命中（kind=text）；插值/指令表达式内字符串经 babel parseExpression 定位；
 *  静态属性（非绑定）保守跳过——文档记录的边界（tasks.md Notes 安全方向）。
 */
import { parseExpression } from '@babel/parser'
import { containsCjk } from './cjk'
import { collectFromBabelAst } from './babelCollect'
import { findTemplateIgnoreMarks } from './ignore'
import { overlapsAny } from './walk'
import { ExplicitCallRange, IgnoreRange, ScanResult, ZeroMarkHit } from './types'

/**
 * @vue/compiler-core AST 节点类型值（compiler-sfc 未导出 NodeTypes，取固定数值）：
 * ELEMENT=1 / TEXT=2 / INTERPOLATION=5 / DIRECTIVE=7
 */
const NODE_ELEMENT = 1
const NODE_TEXT = 2
const NODE_INTERPOLATION = 5
const NODE_DIRECTIVE = 7

interface VueNode {
    type: number
    loc?: { source?: string; start?: { offset?: number }; end?: { offset?: number } }
    [key: string]: unknown
}

/**
 * 扫描模板 AST 中的零标记文案
 * @param source 完整 SFC 源码（模板 AST 的 loc 偏移以它为基准，且用于忽略标记查找）
 * @param templateAst compiler-sfc parse 产出的 descriptor.template.ast（null 安全返回）
 * @param ignoreRanges 已知的忽略区间（模块源码级偏移）
 */
export const scanTemplate = (
    source: string,
    templateAst: unknown,
    ignoreRanges: IgnoreRange[] = []
): ScanResult => {
    const hits: ZeroMarkHit[] = []
    const explicitRanges: ExplicitCallRange[] = []
    if (!templateAst) {
        return { hits, explicitRanges }
    }
    const marks = findTemplateIgnoreMarks(source)
    const elementRanges: { start: number; end: number }[] = []
    const collectedRanges: ExplicitCallRange[] = []

    const scanExpression = (node: VueNode) => {
        const sourceText = node.loc?.source
        const base = node.loc?.start?.offset
        if (typeof sourceText !== 'string' || typeof base !== 'number') {
            return
        }
        let ast: unknown = null
        try {
            ast = parseExpression(sourceText, { errorRecovery: true })
        } catch {
            return
        }
        const collected = collectFromBabelAst(ast, base)
        collectedRanges.push(...collected.explicitRanges)
        for (const literal of collected.literals) {
            pushLiteral(literal, 'literal')
        }
    }

    const pushLiteral = (
        literal: { text: string; start: number; end: number },
        kind: ZeroMarkHit['kind']
    ) => {
        if (!containsCjk(literal.text)) {
            return
        }
        if (overlapsAny(literal.start, literal.end, collectedRanges)) {
            return
        }
        hits.push({
            text: literal.text,
            kind,
            start: literal.start,
            end: literal.end,
            source: 'template',
            ignored: false,
        })
    }

    walkTemplate(templateAst)
    // 模板忽略标记：覆盖紧随其后的第一个元素（contracts C-3）
    const effectiveIgnores: IgnoreRange[] = [...ignoreRanges]
    for (const mark of marks) {
        const next = elementRanges
            .filter((range) => range.start >= mark.end)
            .sort((left, right) => left.start - right.start)[0]
        if (next) {
            effectiveIgnores.push({ start: next.start, end: next.end })
        }
    }
    const kept = hits.filter((hit) => !overlapsAny(hit.start, hit.end, effectiveIgnores))
    return { hits: kept, explicitRanges: collectedRanges }

    function walkTemplate(node: unknown) {
        if (Array.isArray(node)) {
            for (const item of node) walkTemplate(item)
            return
        }
        if (!node || typeof node !== 'object') return
        const current = node as VueNode
        if (typeof current.type !== 'number') return
        if (current.type === NODE_TEXT) {
            const raw = current.loc?.source ?? ''
            const trimmed = raw.trim()
            if (trimmed && containsCjk(trimmed)) {
                const leading = raw.length - raw.trimStart().length
                const start = (current.loc?.start?.offset ?? 0) + leading
                pushLiteral({ text: trimmed, start, end: start + trimmed.length }, 'text')
            }
            return
        }
        if (current.type === NODE_INTERPOLATION) {
            const content = current.content as VueNode | undefined
            if (content && typeof content.type === 'number') {
                scanExpression(content)
            }
            return
        }
        if (current.type === NODE_DIRECTIVE) {
            const exp = current.exp as VueNode | undefined
            if (exp && typeof exp.type === 'number') {
                scanExpression(exp)
            }
            return
        }
        if (current.type === NODE_ELEMENT) {
            const start = current.loc?.start?.offset
            const end = current.loc?.end?.offset
            if (typeof start === 'number' && typeof end === 'number') {
                elementRanges.push({ start, end })
            }
            // 静态属性（type 6）保守跳过，不扫其 value
            const props = current.props as unknown[] | undefined
            if (props) {
                for (const prop of props) {
                    const propNode = prop as VueNode
                    if (propNode && propNode.type === NODE_DIRECTIVE) {
                        const exp = propNode.exp as VueNode | undefined
                        if (exp && typeof exp.type === 'number') {
                            scanExpression(exp)
                        }
                    }
                }
            }
            const children = current.children as unknown[] | undefined
            if (children) {
                for (const child of children) walkTemplate(child)
            }
            return
        }
        // 其它容器类型（如未来版本可能出现的 ROOT 根节点）防御性递归 children，
        // 避免静默漏扫整棵子树
        const children = current.children as unknown[] | undefined
        if (children) {
            for (const child of children) walkTemplate(child)
        }
    }
}
