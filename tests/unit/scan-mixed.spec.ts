/*
 * @FilePath: /auto-i18n/tests/unit/scan-mixed.spec.ts
 * @Description: 显式 API 与零标记混合共存单元测试（US3，FR-008）
 */
import { describe, expect, it } from 'vitest'
import { autoi18nPlugin } from '../../src/autoi18n/autoi18nPlugin'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessageItem, Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

const mixedCode = `<template>
    <p class="explicit">{{ $translate(\`显式文案标题\`) }}</p>
    <p class="zero">零标记文案段落</p>
    <p class="both">{{ $translate(\`两种写法同款文案\`) }}</p>
</template>
<script setup lang="ts">
import { autoTranslate } from 'auto-i18n-vue'

const bothLabel = autoTranslate(\`两种写法同款文案\`)
const zeroLabel = '零标记脚本文案'
</script>`

const stubTranslate = async (questions: string[], _tos: unknown, from: TranslateTarget) => {
    const msgs: Autoi18nMessages = {}
    for (const q of questions) {
        msgs[translateHashKey(q)] = {
            [from]: q,
            [TranslateTarget.EN]: `EN(${q})`,
        } as Autoi18nMessageItem
    }
    return msgs
}

const buildPlugin = (questionsSeen: string[]) => {
    const plugin = autoi18nPlugin({
        isDev: true,
        locale: TranslateTarget.ZH,
        targets: [TranslateTarget.ZH, TranslateTarget.EN],
        translate: async (questions, tos, from, cache) => {
            questionsSeen.push(...questions)
            return stubTranslate(questions, tos, from)
        },
        readTranslateContent: async () => ({}),
        saveTranslateContent: async () => true,
    })
    return plugin
}

const countOccurrences = (code: string, needle: string): number => {
    return code.split(needle).length - 1
}

describe('混合写法共存（US3）', () => {
    it('显式调用点改写恰一次、零标记独立改写、无嵌套包裹', async () => {
        const questionsSeen: string[] = []
        const plugin = buildPlugin(questionsSeen)
        await plugin.buildStart({} as never)
        const result = await plugin.transform(mixedCode, 'Mixed.vue')
        const code = typeof result === 'string' ? result : result?.code ?? ''

        // 显式调用点：$translate( 与 autoTranslate( 被完全替换为 _localeTranslate(，各恰一次
        expect(countOccurrences(code, '_localeTranslate(')).toBe(3) // 模板两处 + script 一处
        expect(code).not.toContain('$translate(')
        expect(code).not.toContain('autoTranslate(')
        // 零标记：两处（模板段落 + script 字面量）
        expect(countOccurrences(code, '_autoScanTranslate(')).toBe(2)
        // 无嵌套包裹
        expect(code).not.toContain('_localeTranslate(_autoScanTranslate')
        expect(code).not.toContain('_autoScanTranslate(_localeTranslate')
    })

    it('两来源文案合并去重：翻译调用只收到唯一集合', async () => {
        const questionsSeen: string[] = []
        const plugin = buildPlugin(questionsSeen)
        await plugin.buildStart({} as never)
        await plugin.transform(mixedCode, 'Mixed.vue')

        // '两种写法同款文案' 既有显式又有零标记出现——只翻译一次
        const seen = questionsSeen.filter((q) => q === '两种写法同款文案')
        expect(seen).toHaveLength(1)
        // 全集合无重复
        expect(new Set(questionsSeen).size).toBe(questionsSeen.length)
    })

    it('混合产物词条完整（显式与零标记各文案均有译文）', async () => {
        const questionsSeen: string[] = []
        const plugin = buildPlugin(questionsSeen)
        await plugin.buildStart({} as never)
        const result = await plugin.transform(mixedCode, 'Mixed.vue')
        const code = typeof result === 'string' ? result : result?.code ?? ''

        for (const text of ['显式文案标题', '零标记文案段落', '两种写法同款文案', '零标记脚本文案']) {
            expect(code).toContain(`EN(${text})`)
        }
    })
})
