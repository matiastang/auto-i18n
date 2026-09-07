/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/walk.ts
 * @Description: babel 与 Vue 模板 AST 通用的结构遍历器
 *  两类 AST 均为 JSON 树：节点带 type（字符串/数值），位置信息（babel 的 start/end
 *  与 Vue 的 loc）一律跳过，由 visit 回调中各扫描器自行读取
 */

export interface GenericNode {
    type: string | number
    [key: string]: unknown
}

/**
 * 无子节点语义的元信息键（防止遍历进注释/位置/附加信息）
 */
const SKIP_KEYS = new Set([
    'type',
    'loc',
    'start',
    'end',
    'range',
    'leadingComments',
    'trailingComments',
    'innerComments',
    'comments',
    'extra',
])

/**
 * 深度优先遍历 AST 树，父节点先于子节点访问
 * @param node 任意节点/数组/值（非树形结构安全跳过）
 * @param visit 访问回调（第二参数为直接父节点，根节点为 null——用于区分
 *              字符串所处的语法位置，如对象键 / 属性访问器 / import 路径）
 */
export const walkAst = (
    node: unknown,
    visit: (node: GenericNode, parent: GenericNode | null) => void,
    parent: GenericNode | null = null
): void => {
    if (Array.isArray(node)) {
        for (const item of node) {
            walkAst(item, visit, parent)
        }
        return
    }
    if (!node || typeof node !== 'object') {
        return
    }
    const current = node as GenericNode
    if (typeof current.type !== 'string' && typeof current.type !== 'number') {
        return
    }
    visit(current, parent)
    for (const key of Object.keys(current)) {
        if (SKIP_KEYS.has(key)) {
            continue
        }
        const value = current[key]
        if (value && typeof value === 'object') {
            walkAst(value, visit, current)
        }
    }
}

/**
 * 判断区间是否与任一给定区间相交
 */
export const overlapsAny = (
    start: number,
    end: number,
    ranges: { start: number; end: number }[]
): boolean => {
    return ranges.some((range) => start < range.end && end > range.start)
}
