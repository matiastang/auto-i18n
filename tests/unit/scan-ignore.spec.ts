/*
 * @FilePath: /auto-i18n/tests/unit/scan-ignore.spec.ts
 * @Description: src/autoi18n/scan/ignore.ts 忽略标记位置识别单元测试
 */
import { describe, expect, it } from 'vitest'
import {
    SCRIPT_IGNORE_MARK,
    TEMPLATE_IGNORE_MARK,
    findScriptIgnoreMarks,
    findTemplateIgnoreMarks,
} from '../../src/autoi18n/scan/ignore'

describe('findScriptIgnoreMarks（script 段 /* autoi18n-ignore */ 标记位置）', () => {
    it('识别块注释标记并返回精确区间', () => {
        const code = `/* autoi18n-ignore */\nconst a = '跳过翻译'`
        const marks = findScriptIgnoreMarks(code)
        expect(marks).toHaveLength(1)
        expect(code.slice(marks[0].start, marks[0].end)).toBe('/* autoi18n-ignore */')
    })

    it('前后空白容忍', () => {
        const code = `const x = 1\n/*  autoi18n-ignore  */\nconst b = '跳过'`
        const marks = findScriptIgnoreMarks(code)
        expect(marks).toHaveLength(1)
        expect(code.slice(marks[0].start, marks[0].end)).toBe('/*  autoi18n-ignore  */')
    })

    it('大小写敏感：大写标记不命中', () => {
        const code = `/* AUTOI18N-IGNORE */\nconst a = '原文'`
        expect(findScriptIgnoreMarks(code)).toHaveLength(0)
    })

    it('同源码多个标记返回多个区间且有序', () => {
        const code = [
            "/* autoi18n-ignore */ const a = '跳过一'",
            "const b = '正常文案'",
            "/* autoi18n-ignore */ const c = '跳过二'",
        ].join('\n')
        const marks = findScriptIgnoreMarks(code)
        expect(marks).toHaveLength(2)
        expect(marks[0].end).toBeLessThanOrEqual(marks[1].start)
    })

    it('无标记返回空数组', () => {
        expect(findScriptIgnoreMarks("const a = '中文文案'")).toHaveLength(0)
    })

    it('标记常量契约', () => {
        expect(SCRIPT_IGNORE_MARK).toBe('autoi18n-ignore')
        expect(TEMPLATE_IGNORE_MARK).toBe('autoi18n-ignore')
    })
})

describe('findTemplateIgnoreMarks（模板段 <!-- autoi18n-ignore --> 标记位置）', () => {
    it('识别 HTML 注释标记并返回精确区间', () => {
        const tpl = `<div>\n<!-- autoi18n-ignore -->\n<p>跳过翻译</p>\n</div>`
        const marks = findTemplateIgnoreMarks(tpl)
        expect(marks).toHaveLength(1)
        expect(tpl.slice(marks[0].start, marks[0].end)).toBe('<!-- autoi18n-ignore -->')
    })

    it('前后空白容忍', () => {
        const tpl = `<!--  autoi18n-ignore  --><p>跳过</p>`
        const marks = findTemplateIgnoreMarks(tpl)
        expect(marks).toHaveLength(1)
    })

    it('大小写敏感：大写标记不命中', () => {
        expect(findTemplateIgnoreMarks(`<!-- AUTOI18N-IGNORE --><p>x</p>`)).toHaveLength(0)
    })

    it('无标记返回空数组', () => {
        expect(findTemplateIgnoreMarks('<p>中文文案</p>')).toHaveLength(0)
    })
})
