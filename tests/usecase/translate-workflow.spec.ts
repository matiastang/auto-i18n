/*
 * @FilePath: /auto-i18n/tests/usecase/translate-workflow.spec.ts
 * @Description: Use Case——接入插件后"读缓存 → 采集翻译 → 保存合并"完整工作流
 *
 * 说明：autoi18nPlugin 内部状态（autoi18nPluginInfo）是模块级单例，
 * 每个用例前 vi.resetModules() 后动态 import，保证用例间隔离。
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { InputOptions } from 'rollup'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessageItem, Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

/** 生成一个含 $translate 调用的最小 SFC */
const sfc = (text: string) =>
    `<template>\n  <p>{{ $translate(\`${text}\`) }}</p>\n</template>\n<script setup lang="ts">\n</script>\n`

/** 字典式 mock 翻译（离线，绝不调用 AI） */
const dictionaryTranslate = async (
    questions: string[],
    _tos: TranslateTarget[],
    from: TranslateTarget
) => {
    const msgs: Autoi18nMessages = {}
    for (const q of questions) {
        msgs[translateHashKey(q)] = {
            [from]: q,
            [TranslateTarget.EN]: `EN(${q})`,
        } as Autoi18nMessageItem
    }
    return msgs
}

beforeEach(() => {
    vi.resetModules()
})

const loadPlugin = async () => {
    const mod = await import('../../src/autoi18n/autoi18nPlugin')
    return mod.autoi18nPlugin
}

describe('Use Case: 翻译采集工作流', () => {
    it('buildStart 读缓存 → transform 采集新文案并注入 → buildEnd 保存合并结果', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const cachedKey = translateHashKey('已有文案')

        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({
                [cachedKey]: {
                    zh: '已有文案',
                    en: 'Existing',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        // 1. 构建开始：读取既有缓存
        await plugin.buildStart({} as InputOptions)

        // 2. 开发转换：新文案触发翻译并注入本模块（缓存合并发生在保存阶段）
        const code = sfc('新文案')
        const out = await plugin.transform(code, '/project/src/App.vue')
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('EN(新文案)')
        expect(out).not.toContain('$translate(')

        // 3. 构建结束：保存"缓存 ∪ 新译文"
        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        const merged = saved[0]
        expect(merged[cachedKey]?.en).toBe('Existing')
        expect(merged[translateHashKey('新文案')]?.en).toBe('EN(新文案)')
        expect(merged[translateHashKey('新文案')]?.zh).toBe('新文案')
    })

    it('全部命中缓存（translate 返回 null）时回退缓存注入且不触发保存', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saveFn = vi.fn(async () => true)
        const cachedKey = translateHashKey('缓存文案')
        const plugin = autoi18nPlugin({
            isDev: true,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: vi.fn(async () => null),
            readTranslateContent: async () => ({
                [cachedKey]: {
                    zh: '缓存文案',
                    en: 'Cached',
                } as Autoi18nMessageItem,
            }),
            saveTranslateContent: saveFn,
        })

        await plugin.buildStart({} as InputOptions)
        const out = await plugin.transform(sfc('缓存文案'), '/project/src/App.vue')
        expect(out).toContain('_localeTranslate')
        expect(out).toContain('Cached')

        await plugin.buildEnd()
        expect(saveFn).not.toHaveBeenCalled()
    })

    it('isDev=false 生产模式不注入代码，但新译文仍被保存', async () => {
        const autoi18nPlugin = await loadPlugin()
        const saved: Autoi18nMessages[] = []
        const plugin = autoi18nPlugin({
            isDev: false,
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
            translate: dictionaryTranslate,
            readTranslateContent: async () => ({}),
            saveTranslateContent: async (data) => {
                saved.push(data)
                return true
            },
        })

        await plugin.buildStart({} as InputOptions)
        const code = sfc('生产文案')
        const out = await plugin.transform(code, '/project/src/App.vue')
        expect(out).toBe(code)

        await plugin.buildEnd()
        expect(saved).toHaveLength(1)
        expect(saved[0][translateHashKey('生产文案')]?.en).toBe('EN(生产文案)')
    })
})
