// @vitest-environment jsdom
/*
 * @FilePath: /auto-i18n/tests/unit/autoi18n.spec.ts
 * @Description: src/autoi18n/autoi18n.ts（Vue 运行时插件）单元测试
 */
import { beforeEach, describe, expect, it, vi } from 'vitest'
import { createApp, defineComponent, h, inject } from 'vue'
import { mount } from '@vue/test-utils'

// readJsonFile 走 XHR，这里 partial mock 以断言"非 .json 路径不读取"
vi.mock('../../src/autoi18n/utils', async (importOriginal) => {
    const actual = await importOriginal<typeof import('../../src/autoi18n/utils')>()
    return {
        ...actual,
        readJsonFile: vi.fn(async () => {
            throw new Error('should not read')
        }),
    }
})

import { autoi18n, autoi18nInfo, autoTranslate } from '../../src/autoi18n/autoi18n'
import { readJsonFile } from '../../src/autoi18n/utils'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'
import { Autoi18nMessageItem } from '../../src/autoi18n/@types/autoi18n'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

const resetState = () => {
    autoi18nInfo.locale = TranslateTarget.ZH
    autoi18nInfo.targets = [TranslateTarget.ZH, TranslateTarget.EN]
    autoi18nInfo.messages = {}
}

beforeEach(() => {
    resetState()
    vi.mocked(readJsonFile).mockClear()
})

describe('autoi18n 插件 install', () => {
    it('应用 locale 与 targets 配置', () => {
        const app = createApp({ render: () => h('div') })
        app.use(autoi18n, {
            locale: TranslateTarget.EN,
            targets: [TranslateTarget.EN, TranslateTarget.JP],
        })
        expect(autoi18nInfo.locale).toBe(TranslateTarget.EN)
        expect(autoi18nInfo.targets).toEqual([TranslateTarget.EN, TranslateTarget.JP])
    })

    it('locale 不在 targets 中时自动前插', () => {
        const app = createApp({ render: () => h('div') })
        app.use(autoi18n, {
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.EN, TranslateTarget.JP],
        })
        expect(autoi18nInfo.targets).toEqual([
            TranslateTarget.ZH,
            TranslateTarget.EN,
            TranslateTarget.JP,
        ])
    })

    it('filePath 非 .json 后缀时不读取翻译文件', () => {
        const app = createApp({ render: () => h('div') })
        app.use(autoi18n, {
            filePath: '/translate.txt',
            locale: TranslateTarget.ZH,
            targets: [TranslateTarget.ZH, TranslateTarget.EN],
        })
        expect(readJsonFile).not.toHaveBeenCalled()
    })

    it('向组件 provide $autoi18n 与 $translate', () => {
        const Child = defineComponent({
            setup() {
                const info = inject<unknown>('$autoi18n')
                const translate = inject<unknown>('$translate')
                return () =>
                    h(
                        'div',
                        `${info === autoi18nInfo ? 'info-ok' : 'info-bad'}|${
                            typeof translate === 'function' ? 'fn-ok' : 'fn-bad'
                        }`
                    )
            },
        })
        const wrapper = mount(Child, {
            global: {
                plugins: [
                    [
                        autoi18n,
                        {
                            locale: TranslateTarget.ZH,
                            targets: [TranslateTarget.ZH, TranslateTarget.EN],
                        },
                    ],
                ],
            },
        })
        expect(wrapper.text()).toBe('info-ok|fn-ok')
        // globalProperties 上也可用
        expect(
            typeof wrapper.vm.$.appContext.config.globalProperties.$translate
        ).toBe('function')
    })
})

describe('autoTranslate', () => {
    it('命中当前语言返回译文', () => {
        const key = translateHashKey('你好')
        autoi18nInfo.messages = {
            [key]: { zh: '你好', en: 'Hello' } as Autoi18nMessageItem,
        }
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('你好')).toBe('Hello')
    })

    it('未命中 key 时回退原文', () => {
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('不存在的文案')).toBe('不存在的文案')
    })

    it('当前语言无值时回退原文', () => {
        const key = translateHashKey('你好')
        autoi18nInfo.messages = { [key]: { zh: '你好' } as Autoi18nMessageItem }
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('你好')).toBe('你好')
    })

    it('支持 {name} 形式插值', () => {
        const key = translateHashKey('欢迎你，{name}')
        autoi18nInfo.messages = {
            [key]: {
                zh: '欢迎你，{name}',
                en: 'Welcome, {name}',
            } as Autoi18nMessageItem,
        }
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('欢迎你，{name}', { name: 'Tom' })).toBe('Welcome, Tom')
    })

    it('插值支持数字类型', () => {
        const key = translateHashKey('共{n}条')
        autoi18nInfo.messages = {
            [key]: { zh: '共{n}条', en: '{n} items' } as Autoi18nMessageItem,
        }
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('共{n}条', { n: 3 })).toBe('3 items')
    })

    it('插值值含 $& 等特殊替换串时原样输出（替换串模式展开回归）', () => {
        const key = translateHashKey('值{name}')
        autoi18nInfo.messages = {
            [key]: { zh: '值{name}', en: 'V: {name}' } as Autoi18nMessageItem,
        }
        autoi18nInfo.locale = TranslateTarget.EN
        expect(autoTranslate('值{name}', { name: 'A$&B' })).toBe('V: A$&B')
        expect(autoTranslate('值{name}', { name: "$`$'" })).toBe('V: $`$\'')
    })
})
