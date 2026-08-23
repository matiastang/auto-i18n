/*
 * @FilePath: /auto-i18n/tests/unit/utils-translate.spec.ts
 * @Description: src/autoi18n/utils/translate.ts 纯函数单元测试
 */
import { describe, expect, it } from 'vitest'
import {
    translateTargetText,
    detectionTranslateMsg,
    detectionTranslateText,
    translateHashKey,
    checkQuestions,
    devTransformMessages,
    devInjectMessages,
    devTransformMethod,
} from '../../src/autoi18n/utils/translate'
import { TranslateTarget } from '../../src/autoi18n/@types/enum'

describe('translateTargetText', () => {
    it('返回全部支持语言的描述', () => {
        expect(translateTargetText(TranslateTarget.ZH)).toBe('中文')
        expect(translateTargetText(TranslateTarget.EN)).toBe('英语')
        expect(translateTargetText(TranslateTarget.JP)).toBe('日语')
        expect(translateTargetText(TranslateTarget.ARA)).toBe('阿拉伯语')
        expect(translateTargetText(TranslateTarget.FRA)).toBe('法语')
    })

    it('未知语言返回 null', () => {
        expect(translateTargetText('unknown' as TranslateTarget)).toBeNull()
    })
})

describe('detectionTranslateMsg / detectionTranslateText / checkQuestions', () => {
    it('提取 $translate 无参调用', () => {
        const code = 'const a = $translate(`你好`)'
        expect(detectionTranslateMsg(code)).toEqual(['$translate(`你好`)'])
        expect(detectionTranslateText('$translate(`你好`)')).toBe('你好')
    })

    it('提取 $translate 带 options 调用', () => {
        const code = "$translate(`欢迎你，{name}`, { name: userName })"
        const msgs = detectionTranslateMsg(code)
        expect(msgs).toHaveLength(1)
        expect(detectionTranslateText(msgs[0])).toBe('欢迎你，{name}')
    })

    it('提取 autoTranslate 调用（含带 options）', () => {
        const code = "const b = autoTranslate('公司名称')\nconst c = autoTranslate('用户：{name}', { name })"
        const msgs = detectionTranslateMsg(code)
        expect(msgs).toHaveLength(2)
        expect(detectionTranslateText(msgs[0])).toBe('公司名称')
        expect(detectionTranslateText(msgs[1])).toBe('用户：{name}')
    })

    it('提取模板中的调用（Vue SFC 场景）', () => {
        const code = `<template>
    <p>{{ $translate(\`个人介绍\`) }}</p>
    <p>{{ $translate(\`公司名称：{name}\`, {
        name: companyName,
    })}}</p>
</template>`
        const questions = checkQuestions(code)
        expect(questions).toContain('个人介绍')
        expect(questions).toContain('公司名称：{name}')
    })

    it('无调用时返回空数组', () => {
        expect(detectionTranslateMsg('const a = 1')).toEqual([])
        expect(checkQuestions('const a = 1')).toEqual([])
    })

    it('非翻译调用文本返回 null', () => {
        expect(detectionTranslateText('not a translate call')).toBeNull()
    })
})

describe('translateHashKey', () => {
    it('默认前缀为 autoi18n，值为 MD5 摘要（确定性）', () => {
        // md5('test') = 098f6bcd4621d373cade4e832627b4f6
        expect(translateHashKey('test')).toBe('autoi18n_098f6bcd4621d373cade4e832627b4f6')
        expect(translateHashKey('test')).toBe(translateHashKey('test'))
        expect(translateHashKey('test2')).not.toBe(translateHashKey('test'))
    })

    it('空前缀时只返回哈希', () => {
        expect(translateHashKey('test', '')).toBe('098f6bcd4621d373cade4e832627b4f6')
    })

    it('自定义前缀', () => {
        expect(translateHashKey('test', 'custom')).toBe('custom_098f6bcd4621d373cade4e832627b4f6')
    })
})

describe('devTransformMessages', () => {
    it('生成消息字面量代码', () => {
        const key = translateHashKey('你好')
        const code = devTransformMessages({
            [key]: { zh: '你好', en: 'Hello' },
        })
        expect(code).toContain(`  ${key}: {`)
        expect(code).toContain(`zh: '你好',`)
        expect(code).toContain(`en: 'Hello',`)
        expect(code.trim().startsWith('{')).toBe(true)
        expect(code.trim().endsWith('}')).toBe(true)
    })
})

describe('devInjectMessages', () => {
    it('注入到 script 开标签之后', () => {
        const sfc = `<template><p>hi</p></template>\n<script setup lang="ts">\nconst a = 1\n</script>`
        const injected = devInjectMessages(sfc, '/* INJECT */')
        expect(injected).toContain('<script setup lang="ts">\n/* INJECT */\n')
        // 原内容保留
        expect(injected).toContain('const a = 1')
    })
})

describe('devTransformMethod', () => {
    it('替换 $translate 与 autoTranslate 调用为 _localeTranslate', () => {
        const code = '$translate(`a`) + autoTranslate(`b`)'
        expect(devTransformMethod(code)).toBe('_localeTranslate(`a`) + _localeTranslate(`b`)')
    })

    it('不影响 _localeTranslate 自身定义', () => {
        const code = 'const _localeTranslate = (key) => key'
        expect(devTransformMethod(code)).toBe(code)
    })
})
