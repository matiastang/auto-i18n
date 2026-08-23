/*
 * @FilePath: /auto-i18n/tests/unit/index-exports.spec.ts
 * @Description: 库入口公开导出契约测试（FR-005）——接入方依赖的运行时导出与枚举
 */
import { describe, expect, it } from 'vitest'
import * as autoi18nVue from '../../src/autoi18n/index'
import {
    autoi18n,
    autoi18nInfo,
    autoTranslate,
    autoi18nPlugin,
    freeTranslate,
    openaiTranslate,
    zhipuaiTranslate,
    resolveTranslateFunction,
    toIsoLocale,
    TranslateTarget,
    TranslateAIModel,
} from '../../src/autoi18n/index'

describe('入口导出契约（auto-i18n-vue）', () => {
    it('运行时核心导出', () => {
        expect(typeof autoi18n.install).toBe('function')
        expect(autoi18nInfo).toBeDefined()
        expect(typeof autoTranslate).toBe('function')
        expect(typeof autoi18nPlugin).toBe('function')
    })

    it('三种翻译源与调度器导出', () => {
        expect(typeof freeTranslate).toBe('function')
        expect(typeof openaiTranslate).toBe('function')
        expect(typeof zhipuaiTranslate).toBe('function')
        expect(typeof resolveTranslateFunction).toBe('function')
    })

    it('枚举导出：TranslateTarget 全成员', () => {
        expect(TranslateTarget.ZH).toBe('zh')
        expect(TranslateTarget.EN).toBe('en')
        expect(TranslateTarget.JP).toBe('jp')
        expect(TranslateTarget.ARA).toBe('ara')
        expect(TranslateTarget.FRA).toBe('fra')
    })

    it('枚举导出：TranslateAIModel 全成员（ZHIPUAI/OPENAI）', () => {
        expect(TranslateAIModel.ZHIPUAI).toBe('zhipuai')
        expect(TranslateAIModel.OPENAI).toBe('openai')
    })

    it('工具导出：toIsoLocale', () => {
        expect(typeof toIsoLocale).toBe('function')
        expect(toIsoLocale(TranslateTarget.JP)).toBe('ja')
    })

    it('工具导出：缓存读写与哈希（既有能力不回退）', () => {
        expect(typeof autoi18nVue.translateHashKey).toBe('function')
        expect(typeof autoi18nVue.checkQuestions).toBe('function')
        expect(typeof autoi18nVue.readJsonFile).toBe('function')
    })
})
