<!--
 * @Author: matiastang
 * @Date: 2023-07-21 15:14:42
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-28 18:02:35
 * @FilePath: /auto-i18n/src/views/Components/Header/Header.vue
 * @Description: Header
-->
<template>
    <div class="header">
        <div class="title">
            <div class="item">{{ $translate(`工作台`) }}</div>
            <div class="item">{{ $translate(`基金圈：{name}`, {
                name: orgName
            }) }}</div>
            <div class="item">{{ $translate('投研模板') }}</div>
            <div class="item">{{ $translate('况客推荐') }}</div>
            <div class="item">{{ localeName }}</div>
        </div>
        <div class="change" @click="changeClick">{{ $translate('切换') }}</div>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance, inject, ref, computed, watch } from 'vue'
// import { translateHashKey } from '@autoi18n/utils'
import { Autoi18n, Autoi18nTranslate, Autoi18nMessages, Autoi18nMessageItem, Autoi18nMessageValue } from '@autoi18n/type'

const autoi18n = inject<Autoi18n>('$autoi18n')
const translate = inject<Autoi18nTranslate>('$translate')

// const _autoi18n = inject<Autoi18n>('$autoi18n')

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
//             return String(left).replaceAll('{' + _key + '}', _val)
//         }, value)
//     }
//     return value
// }

const orgName = ref('机构圈01')

const localeName = computed(() => {
    const nowLocale = autoi18n.locale
    console.log(autoi18n)
    if (nowLocale === 'zh') {
        // return translate('中文')
        return '中文'
    }
    // return translate('英文')
    return '英文'
})

const changeClick = () => {
    const nowLocale = autoi18n.locale
    console.log(nowLocale)
    if (nowLocale === 'zh') {
        autoi18n.locale = 'en'
    } else {
        autoi18n.locale = 'zh'
    }
}

// const appProxy = getCurrentInstance()?.proxy

// watch(appProxy?.$autoi18n.locale, (oldValue, newValue) => {
//     console.log(oldValue, newValue)
// })

</script>

<style lang="less" scoped>
.header {
    box-sizing: border-box;
    width: 100%;
    height: 60px;
    padding: 32px;
    background: white;
    display: flex;
    align-items: center;
    justify-content: space-between;

    .title {
        display: flex;
        align-items: center;

        .item {
            margin: 0px 16px;
        }
    }

    .change {
        cursor: pointer;
    }
}
</style>