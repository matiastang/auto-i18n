/*
 * @FilePath: /auto-i18n/tests/unit/scan-cjk.spec.ts
 * @Description: src/autoi18n/scan/cjk.ts 零标记文案判定（CJK 启发式）单元测试
 */
import { describe, expect, it } from 'vitest'
import { containsCjk, CJK_PATTERN } from '../../src/autoi18n/scan/cjk'

describe('containsCjk / CJK_PATTERN（判定契约 contracts C-4）', () => {
    it('含 CJK 统一表意字符的字符串命中', () => {
        expect(containsCjk('个人介绍')).toBe(true)
        expect(containsCjk('中文即 Key')).toBe(true)
    })

    it('CJK 扩展A 区命中', () => {
        expect(containsCjk('㐀㐁')).toBe(true)
        expect(CJK_PATTERN.test('\u3400')).toBe(true)
    })

    it('日文假名命中（目标语言含 JP）', () => {
        expect(containsCjk('こんにちは')).toBe(true)
        expect(containsCjk('カタカナ')).toBe(true)
    })

    it('谚文音节命中', () => {
        expect(containsCjk('한국어')).toBe(true)
    })

    it('中英/占位符混合串命中', () => {
        expect(containsCjk('共 {count} 条未读消息')).toBe(true)
        expect(containsCjk('User: {name} 用户')).toBe(true)
    })

    it('纯 ASCII 字符串不命中（路由/事件名/className 等）', () => {
        expect(containsCjk('active')).toBe(false)
        expect(containsCjk('/login')).toBe(false)
        expect(containsCjk('click')).toBe(false)
        expect(containsCjk('It is 12:00')).toBe(false)
    })

    it('仅全角标点不命中（必须至少一个表意/假名/谚文字符）', () => {
        expect(containsCjk('《》「」，！')).toBe(false)
        expect(containsCjk('——……')).toBe(false)
    })

    it('空串与纯数字不命中', () => {
        expect(containsCjk('')).toBe(false)
        expect(containsCjk('123')).toBe(false)
        expect(containsCjk('12.5%')).toBe(false)
    })
})
