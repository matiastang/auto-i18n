/*
 * @FilePath: /auto-i18n/tests/unit/scan-script.spec.ts
 * @Description: src/autoi18n/scan/scriptScan.ts script 段字符串扫描单元测试
 */
import { describe, expect, it } from 'vitest'
import { scanScript } from '../../src/autoi18n/scan/scriptScan'
import { findScriptIgnoreMarks } from '../../src/autoi18n/scan/ignore'

const hitsOf = (code: string, offset = 0) => scanScript(code, offset).hits
const rangesOf = (code: string) => scanScript(code, 0).explicitRanges

describe('scanScript：命中（含 CJK 的字符串字面量）', () => {
    it('赋值字面量命中且偏移精确（含引号）', () => {
        const code = `const a = '个人介绍'`
        const hits = hitsOf(code)
        expect(hits).toHaveLength(1)
        expect(hits[0].text).toBe('个人介绍')
        expect(hits[0].kind).toBe('literal')
        expect(hits[0].source).toBe('script')
        expect(code.slice(hits[0].start, hits[0].end)).toBe(`'个人介绍'`)
        expect(hits[0].ignored).toBe(false)
    })

    it('函数实参命中', () => {
        const code = `showToast('已删除')`
        const hits = hitsOf(code)
        expect(hits).toHaveLength(1)
        expect(hits[0].text).toBe('已删除')
    })

    it('三元分支逐字面量命中', () => {
        const code = `const t = ok ? '保存成功' : '保存失败'`
        const hits = hitsOf(code)
        expect(hits.map((h) => h.text)).toEqual(['保存成功', '保存失败'])
    })

    it('数组元素与对象值命中，对象属性键排除', () => {
        const code = `const list = ['日报', '周报']\nconst conf = { label: '标签', '中文键': 1 }`
        const hits = hitsOf(code)
        expect(hits.map((h) => h.text)).toEqual(['日报', '周报', '标签'])
    })

    it('无插值模板字面量命中，含插值的模板字面量跳过（拼接首版边界）', () => {
        const code = 'const a = `中文标签`\nconst b = `共${n}条`'
        const hits = hitsOf(code)
        expect(hits).toHaveLength(1)
        expect(hits[0].text).toBe('中文标签')
    })

    it('对象值内嵌套命中', () => {
        const code = `const conf = { list: [{ name: '嵌套文案' }] }`
        expect(hitsOf(code).map((h) => h.text)).toEqual(['嵌套文案'])
    })
})

describe('scanScript：排除（FR-005 误判防护）', () => {
    it('属性访问器字符串不命中', () => {
        const code = `const v = conf['中文属性名']`
        expect(hitsOf(code)).toHaveLength(0)
    })

    it('import 路径不命中', () => {
        const code = `import 中文工具 from '中文包'`
        expect(hitsOf(code)).toHaveLength(0)
    })

    it('不含 CJK 的字符串一律跳过', () => {
        const code = `const a = 'active'\nconst b = "/login"\nconst c = \`plain\``
        expect(hitsOf(code)).toHaveLength(0)
    })

    it('autoTranslate 显式调用点记入排除区、不产出命中', () => {
        const code = `const b = autoTranslate('公司名称：{name}', { name })`
        const result = scanScript(code, 0)
        expect(result.hits).toHaveLength(0)
        expect(result.explicitRanges).toHaveLength(1)
        const literalStart = code.indexOf(`'公司名称：{name}'`)
        const range = result.explicitRanges[0]
        expect(range.start).toBeLessThanOrEqual(literalStart)
        expect(range.end).toBeGreaterThanOrEqual(literalStart + `'公司名称：{name}'`.length)
    })

    it('显式调用点内的字符串（如 options 实参）受区间保护', () => {
        const code = `const v = autoTranslate('欢迎你，{name}', { name: '访客' })`
        const result = scanScript(code, 0)
        expect(result.hits).toHaveLength(0)
    })
})

describe('scanScript：忽略标记（FR-006，contracts C-3）', () => {
    it('标记覆盖语句内的字符串不产出命中', () => {
        const code = `/* autoi18n-ignore */\nconst a = '不翻译的中文'\nconst b = '要翻译的中文'`
        const marks = findScriptIgnoreMarks(code)
        const result = scanScript(code, 0, marks)
        expect(result.hits.map((h) => h.text)).toEqual(['要翻译的中文'])
    })

    it('同一行内标记之后的语句也被覆盖', () => {
        const code = `/* autoi18n-ignore */ const a = '跳过文案'; const b = '保留文案'`
        const marks = findScriptIgnoreMarks(code)
        const result = scanScript(code, 0, marks)
        expect(result.hits.map((h) => h.text)).toEqual(['保留文案'])
    })
})

describe('scanScript：混合与偏移', () => {
    it('显式调用与零标记命中共存互不干扰', () => {
        const code = `const a = autoTranslate('显式文案')\nconst b = '零标记文案'`
        const result = scanScript(code, 0)
        expect(result.hits.map((h) => h.text)).toEqual(['零标记文案'])
        expect(result.explicitRanges).toHaveLength(1)
    })

    it('offset 叠加为模块级偏移', () => {
        const code = `const a = '个人介绍'`
        const hits = hitsOf(code, 100)
        expect(hits[0].start).toBe(100 + code.indexOf(`'个人介绍'`))
        expect(hits[0].end).toBe(100 + code.indexOf(`'个人介绍'`) + `'个人介绍'`.length)
    })
})
