/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/babelCollect.ts
 * @Description: babel AST 上的字符串字面量与显式调用点收集（scriptScan / templateScan 共用）
 */
import { ExplicitCallRange } from './types'
import { walkAst } from './walk'

/**
 * 显式翻译调用的函数名（$translate 模板全局 / autoTranslate 脚本导入）
 */
export const EXPLICIT_CALLEE_NAMES = ['$translate', 'autoTranslate']

export interface BabelLiteral {
    /** 字面量内容值（不含引号） */
    text: string
    /** 模块源码级起始偏移（含引号） */
    start: number
    /** 模块源码级结束偏移（不含） */
    end: number
}

export interface BabelCollectResult {
    literals: BabelLiteral[]
    explicitRanges: ExplicitCallRange[]
}

/**
 * 从已解析的 babel AST 收集字符串字面量（含无插值模板字面量）与显式调用区间。
 * 显式调用点记录整个调用表达式区间——其内部所有字符串（含 options 实参）一并受保护，
 * 避免插值参数被误改写（research.md R7）。
 *
 * 非文案语法位置的字符串不收集（FR-005 误判防护）：
 * - 对象属性键（ObjectProperty/ObjectMethod/ClassProperty 的 key）
 * - 计算属性访问器（MemberExpression.computed 的 property，如 obj['中文key']）
 * - import/export 的模块路径 source
 *
 * @param ast babel 解析结果（Program 或表达式节点）
 * @param base AST 片段在模块源码中的起始偏移
 */
export const collectFromBabelAst = (ast: unknown, base: number): BabelCollectResult => {
    const literals: BabelLiteral[] = []
    const explicitRanges: ExplicitCallRange[] = []
    walkAst(ast, (node, parent) => {
        if (node.type === 'CallExpression') {
            const callee = node.callee as { type?: string; name?: string } | undefined
            if (callee && callee.type === 'Identifier' && EXPLICIT_CALLEE_NAMES.includes(callee.name ?? '')) {
                explicitRanges.push({
                    start: (node.start as number) + base,
                    end: (node.end as number) + base,
                })
            }
            return
        }
        if (node.type === 'StringLiteral') {
            if (isNonCopyPosition(node, parent)) {
                return
            }
            literals.push({
                text: node.value as string,
                start: (node.start as number) + base,
                end: (node.end as number) + base,
            })
            return
        }
        if (node.type === 'TemplateLiteral') {
            const expressions = node.expressions as unknown[] | undefined
            const quasis = node.quasis as { value?: { cooked?: string } }[] | undefined
            // 含插值的模板字面量跳过（拼接/动态场景首版边界，contracts C-4）
            if (expressions && expressions.length === 0 && quasis && quasis.length === 1) {
                if (isNonCopyPosition(node, parent)) {
                    return
                }
                literals.push({
                    text: quasis[0].value?.cooked ?? '',
                    start: (node.start as number) + base,
                    end: (node.end as number) + base,
                })
            }
        }
    })
    return { literals, explicitRanges }
}

/**
 * 判断字符串字面量是否处于非文案的语法位置
 */
const isNonCopyPosition = (
    node: { [key: string]: unknown },
    parent: { type: string | number; [key: string]: unknown } | null
): boolean => {
    if (!parent) {
        return false
    }
    // 对象属性键
    if (parent.type === 'ObjectProperty' || parent.type === 'ObjectMethod' || parent.type === 'ClassProperty' || parent.type === 'ClassMethod') {
        if (parent.key === node) {
            return true
        }
    }
    // 计算属性访问器 obj['中文key']
    if (parent.type === 'MemberExpression' && parent.computed === true && parent.property === node) {
        return true
    }
    // import/export 模块路径
    if (
        (parent.type === 'ImportDeclaration' || parent.type === 'ExportNamedDeclaration' || parent.type === 'ExportAllDeclaration') &&
        parent.source === node
    ) {
        return true
    }
    return false
}
