/*
 * @FilePath: /auto-i18n/tests/unit/utils-language.spec.ts
 * @Description: src/autoi18n/utils/language.ts 语言代码映射单元测试
 */
import { describe, expect, it } from 'vitest'
import { toIsoLocale } from '../../src/autoi18n/utils/language'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'

describe('toIsoLocale', () => {
    it('内部语言枚举映射为三方服务 ISO 语言代码', () => {
        expect(toIsoLocale(TranslateTarget.ZH)).toBe('zh-CN')
        expect(toIsoLocale(TranslateTarget.EN)).toBe('en')
        expect(toIsoLocale(TranslateTarget.JP)).toBe('ja')
        expect(toIsoLocale(TranslateTarget.ARA)).toBe('ar')
        expect(toIsoLocale(TranslateTarget.FRA)).toBe('fr')
    })

    it('未知语言返回 null（调用方应跳过该目标并警告）', () => {
        expect(toIsoLocale('unknown' as TranslateTarget)).toBeNull()
        expect(toIsoLocale(undefined as unknown as TranslateTarget)).toBeNull()
        expect(toIsoLocale('' as TranslateTarget)).toBeNull()
    })
})
