<!--
 * @Author: matiastang
 * @Date: 2023-07-21 15:14:42
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 17:52:02
 * @FilePath: /auto-i18n/src/Components/Header/Header.vue
 * @Description: Header
-->
<template>
    <div class="header">
        <div class="left">{{ $translate('自动国际化') }}</div>
        <div class="right">
            <div class="item">{{ $translate(`当前语言：{name} 当前时间：{time}`, {
                name: localeName,
                time: new Date().getTime()
            }) }}</div>
            <div class="change" @click="i18nChangeClick">{{ $translate('语言切换') }}</div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { inject, computed } from 'vue'
import { Autoi18nInfo } from '@autoi18n/@types/autoi18n'
import { autoTranslate } from '@autoi18n/autoi18n'

const autoi18n = inject<Autoi18nInfo>('$autoi18n')

// const a = getCurrentInstance()?.proxy
// console.log(a?.$autoi18n)

const localeName = computed(() => {
    const nowLocale = autoi18n.locale
    console.log(`locale=${nowLocale}`)
    if (nowLocale === 'zh') {
        return autoTranslate('中文')
    }
    if (nowLocale === 'jp') {
        return autoTranslate('日文')
    }
    if (nowLocale === 'ara') {
        return autoTranslate('阿拉伯语')
    }
    if (nowLocale === 'fra') {
        return autoTranslate('法语')
    }
    return autoTranslate('英文')
})

const i18nChangeClick = () => {
    const autoLocale = autoi18n.locale
    const autoTargets = autoi18n.targets
    if (autoTargets.length <= 0) {
        console.warn('autoi18n locales is emty')
        return
    }
    const index = autoTargets.findIndex((item) => {
        return item === autoLocale
    })
    if (index >= autoTargets.length - 1) {
        autoi18n.locale = autoTargets[0]
    } else {
        autoi18n.locale = autoTargets[index + 1]
    }
}
/**
 * ====== 测试 ======
 */
// import { translateHashKey } from '@autoi18n/utils'
// import { Autoi18nType, Autoi18nMessages, Autoi18nMessageItem, Autoi18nMessageValue } from '@autoi18n/@types/autoi18n'

// const _autoi18n = inject<Autoi18nType>('$autoi18n')

// const _localeMessages: Autoi18nMessages = {}

// const _localeTranslate = (key: string, options?: {[key: string]: string | number}) => {
//     const locale = _autoi18n.locale
//     const localeKey = translateHashKey(key)
//     const item = _localeMessages[localeKey] as Autoi18nMessageItem
//     if (!item) {
//         return key
//     }
//     const value = item[locale] as Autoi18nMessageValue
//     if (!value) {
//         return key
//     }
//     if (options) {
//         return Object.entries(options).reduce((left, item) => {
//             const [_key, _val] = item
//             return String(left).replaceAll('{' + _key + '}', String(_val))
//         }, value)
//     }
//     return value
// }
</script>

<style lang="less" scoped>
.header {
    box-sizing: border-box;
    width: 100%;
    height: 54px;
    padding: 0px 16px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: space-between;
    border-bottom: 1px solid rgba(84, 84, 84, .12);

    .right {
        display: flex;
        align-items: center;
        .change {
            margin-left: 16px;
            cursor: pointer;
        }
    }
}
</style>