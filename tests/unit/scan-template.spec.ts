/*
 * @FilePath: /auto-i18n/tests/unit/scan-template.spec.ts
 * @Description: src/autoi18n/scan/templateScan.ts 模板段扫描单元测试
 */
import { describe, expect, it } from 'vitest'
import { parse } from '@vue/compiler-sfc'
import { scanTemplate } from '../../src/autoi18n/scan/templateScan'

const scan = (source: string) => {
    const { descriptor } = parse(source)
    const ast = descriptor.template?.ast ?? null
    return scanTemplate(source, ast)
}

describe('scanTemplate：命中（FR-001 四类位置）', () => {
    it('模板文本节点命中（kind=text，区间为去空白后的文本）', () => {
        const source = `<template><p>个人介绍</p></template>`
        const result = scan(source)
        expect(result.hits).toHaveLength(1)
        expect(result.hits[0].kind).toBe('text')
        expect(result.hits[0].text).toBe('个人介绍')
        expect(result.hits[0].source).toBe('template')
        expect(source.slice(result.hits[0].start, result.hits[0].end)).toBe('个人介绍')
    })

    it('插值内的字符串字面量命中（kind=literal）', () => {
        const source = `<template><p>{{ '中文插值' }}</p></template>`
        const result = scan(source)
        expect(result.hits).toHaveLength(1)
        expect(result.hits[0].kind).toBe('literal')
        expect(result.hits[0].text).toBe('中文插值')
        expect(source.slice(result.hits[0].start, result.hits[0].end)).toBe(`'中文插值'`)
    })

    it('绑定属性表达式内的字面量命中', () => {
        const source = `<template><input :placeholder="'中文占位'" /></template>`
        const result = scan(source)
        expect(result.hits).toHaveLength(1)
        expect(result.hits[0].text).toBe('中文占位')
    })

    it('事件处理器表达式内的字面量命中', () => {
        const source = `<template><button @click="toast('已删除')">按钮</button></template>`
        const result = scan(source)
        expect(result.hits.map((h) => h.text)).toEqual(['已删除', '按钮'])
    })

    it('模板字面量字面量（无插值）在表达式中命中', () => {
        const source = `<template><p>{{ \`模板串文案\` }}</p></template>`
        const result = scan(source)
        expect(result.hits.map((h) => h.text)).toEqual(['模板串文案'])
    })
})

describe('scanTemplate：排除（FR-005 / R7）', () => {
    it('$translate 显式调用点记入排除区、不产出命中', () => {
        const source = `<template><p>{{ $translate(\`个人介绍\`) }}</p></template>`
        const result = scan(source)
        expect(result.hits).toHaveLength(0)
        expect(result.explicitRanges).toHaveLength(1)
    })

    it('显式调用点内 options 字符串受保护', () => {
        const source = `<template><p>{{ $translate(\`欢迎 {name}\`, { name: '访客' }) }}</p></template>`
        const result = scan(source)
        expect(result.hits).toHaveLength(0)
        expect(result.explicitRanges).toHaveLength(1)
    })

    it('静态属性（非绑定）保守跳过——文档记录的边界', () => {
        const source = `<template><input placeholder="中文静态占位" /></template>`
        expect(scan(source).hits).toHaveLength(0)
    })

    it('纯英文文本跳过', () => {
        const source = `<template><p>Hello World</p></template>`
        expect(scan(source).hits).toHaveLength(0)
    })

    it('注释中的中文不命中', () => {
        const source = `<template><!-- 中文注释不翻译 --><p>Hello</p></template>`
        expect(scan(source).hits).toHaveLength(0)
    })
})

describe('scanTemplate：边界', () => {
    it('无模板 AST 返回空结果', () => {
        const result = scanTemplate('<script setup>const a = 1</script>', null)
        expect(result.hits).toHaveLength(0)
        expect(result.explicitRanges).toHaveLength(0)
    })

    it('偏移为模块级绝对偏移（多节点场景）', () => {
        const source = `<template>\n  <section>\n    <p>第一段文案</p>\n    <p>第二段文案</p>\n  </section>\n</template>`
        const result = scan(source)
        expect(result.hits.map((h) => source.slice(h.start, h.end))).toEqual([
            '第一段文案',
            '第二段文案',
        ])
    })
})
