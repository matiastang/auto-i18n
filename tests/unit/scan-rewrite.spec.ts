/*
 * @FilePath: /auto-i18n/tests/unit/scan-rewrite.spec.ts
 * @Description: src/autoi18n/scan/rewrite.ts 零标记改写与注入单元测试
 */
import { describe, expect, it } from 'vitest'
import { rewriteSfc } from '../../src/autoi18n/scan/rewrite'
import { ZeroMarkHit } from '../../src/autoi18n/scan/types'
import { Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

const literalHit = (source: string, text: string): ZeroMarkHit => {
    const start = source.indexOf(`'${text}'`)
    return { text, kind: 'literal', start, end: start + `'${text}'`.length, source: 'script', ignored: false }
}

const textHit = (source: string, text: string): ZeroMarkHit => {
    const start = source.indexOf(text)
    return { text, kind: 'text', start, end: start + text.length, source: 'template', ignored: false }
}

const messages: Autoi18nMessages = {
    autoi18n_testkey: { zh: '个人介绍', en: 'EN(个人介绍)' },
}

describe('rewriteSfc：字面量改写（FR-003）', () => {
    it('script 字面量替换为查表调用（统一单引号字面量）', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = literalHit(source, '个人介绍')
        const { code } = rewriteSfc({ source, hits: [hit], messages, injectAt: null })
        expect(code).toContain(`_autoScanTranslate('个人介绍')`)
        expect(code).not.toContain(`= '个人介绍'`)
    })

    it('双引号字面量同样替换；内容含单引号时转义', () => {
        const source = `<script setup>\nconst a = "个人介绍"\nconst b = '含\\'引号\\'文案'\n</script>`
        const hitA = { ...literalHit(source, '个人介绍'), start: source.indexOf('"个人介绍"'), end: source.indexOf('"个人介绍"') + 6 }
        const rawB = `'含\\'引号\\'文案'`
        const startB = source.indexOf(rawB)
        const hitB = { text: "含'引号'文案", kind: 'literal' as const, start: startB, end: startB + rawB.length, source: 'script' as const, ignored: false }
        const { code } = rewriteSfc({ source, hits: [hitA, hitB], messages, injectAt: null })
        expect(code).toContain(`_autoScanTranslate('个人介绍')`)
        expect(code).toContain(`_autoScanTranslate('含\\'引号\\'文案')`)
    })

    it('模板文本节点替换为插值查表调用', () => {
        const source = `<template><p>个人介绍</p></template>`
        const hit = textHit(source, '个人介绍')
        const { code } = rewriteSfc({ source, hits: [hit], messages, injectAt: null })
        expect(code).toContain(`<p>{{ _autoScanTranslate('个人介绍') }}</p>`)
    })

    it('属性绑定值内的改写保持单引号（不破坏 HTML 双引号定界）', () => {
        const source = `<template><input :placeholder="'中文占位'" /></template>`
        const start = source.indexOf(`'中文占位'`)
        const hit = { text: '中文占位', kind: 'literal' as const, start, end: start + `'中文占位'`.length, source: 'template' as const, ignored: false }
        const { code } = rewriteSfc({ source, hits: [hit], messages, injectAt: null })
        expect(code).toContain(`:placeholder="_autoScanTranslate('中文占位')"`)
    })
})

describe('rewriteSfc：注入块（contracts C-2）', () => {
    it('无 script 的 SFC 末尾追加 <script setup> 注入块', () => {
        const source = `<template><p>个人介绍</p></template>`
        const hit = textHit(source, '个人介绍')
        const { code } = rewriteSfc({
            source,
            hits: [hit],
            messages,
            injectAt: { index: source.length, appendScript: true },
        })
        expect(code).toContain('<script setup>')
        expect(code).toContain(
            "import { autoi18nInfo as _autoi18nInfo, translateHashKey as _scanHashKey } from 'auto-i18n-vue'"
        )
        expect(code).toContain('_autoScanTranslate')
        expect(code).not.toContain('inject(')
    })

    it('有 script 时注入到首个 script 开标签之后', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = literalHit(source, '个人介绍')
        const tagEnd = source.indexOf('>')
        const { code } = rewriteSfc({
            source,
            hits: [hit],
            messages,
            injectAt: { index: tagEnd + 1, appendScript: false },
        })
        const importIdx = code.indexOf("from 'auto-i18n-vue'")
        const tagIdx = code.indexOf('<script setup>')
        expect(importIdx).toBeGreaterThan(tagIdx)
        expect(code).toContain('_autoScanTranslate')
    })

    it('子集消息表经 JSON 序列化注入', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = literalHit(source, '个人介绍')
        const { code } = rewriteSfc({
            source,
            hits: [hit],
            messages,
            injectAt: { index: source.indexOf('>') + 1, appendScript: false },
        })
        expect(code).toContain('"autoi18n_testkey"')
        expect(code).toContain('EN(个人介绍)')
    })
})

describe('rewriteSfc：边界', () => {
    it('ignored 命中不改写', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = { ...literalHit(source, '个人介绍'), ignored: true }
        const { code } = rewriteSfc({ source, hits: [hit], messages, injectAt: null })
        expect(code).toContain(`= '个人介绍'`)
        expect(code).not.toContain('_autoScanTranslate(')
    })

    it('返回 sourcemap 且可解析', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = literalHit(source, '个人介绍')
        const { map } = rewriteSfc({ source, hits: [hit], messages, injectAt: null })
        expect(map).not.toBeNull()
        expect((map as { version: number }).version).toBe(3)
    })

    it('无命中时不注入、原样返回', () => {
        const source = `<script setup>\nconst a = 'active'\n</script>`
        const { code, map } = rewriteSfc({ source, hits: [], messages, injectAt: null })
        expect(code).toBe(source)
        expect(map).toBeNull()
    })
})

describe('rewriteSfc：注入内容安全（code review M2）', () => {
    it('译文含闭合 script 标签时转义，不破坏 SFC 块边界', () => {
        const source = `<script setup>\nconst a = '个人介绍'\n</script>`
        const hit = literalHit(source, '个人介绍')
        const closingTag = '</' + 'script>'
        const risky: Autoi18nMessages = {
            autoi18n_risky: { zh: '提示：', en: `Close the tag ${closingTag} now` },
        }
        const { code } = rewriteSfc({
            source,
            hits: [hit],
            messages: risky,
            injectAt: { index: source.indexOf('>') + 1, appendScript: false },
        })
        // 注入内容中的 "<" 已转义为 \u003c（JSON 语义等价）
        expect(code).toContain('\\u003c/script')
        // 译文中的真实闭合标签不再出现在产物中
        expect(code).not.toContain(`${closingTag} now`)
        // SFC 结构未被破坏：产物中仅剩原 SFC 自己的 </script> 结束标签一处
        expect(code.indexOf('</script>')).toBe(code.lastIndexOf('</script>'))
    })
})
