<!--
 * @Author: matiastang
 * @Date: 2023-07-21 15:14:42
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-24 11:31:11
 * @FilePath: /auto-i18n/src/views/Components/Header/Header.vue
 * @Description: Header
-->
<template>
    <div class="header">
        <div class="title">
            <div class="item">{{ $translate('工作台') }}</div>
            <div class="item">{{ $translate('基金圈：机构圈01') }}</div>
            <div class="item">{{ $translate('投研模板') }}</div>
            <div class="item">{{ $translate('况客推荐') }}</div>
            <div class="item">{{ localeName }}</div>
        </div>
        <div class="change" @click="changeClick">{{ $translate('切换') }}</div>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance, inject, computed, watch } from 'vue'
import { Autoi18nMessages, Autoi18n } from '@autoi18n/type'

const _autoi18n = inject<Autoi18n>('$autoi18n')

const localeName = computed(() => {
    const nowLocale = _autoi18n.locale
    if (nowLocale === 'zh') {
        return $translate('中文')
    }
    return $translate('英文')
})

// const localeMessages: Autoi18nMessages = {}

// const localeTranslate = (key: string) => {
//     const locale = autoi18n.locale
//     const values = localeMessages[key]
//     if (!values) {
//         return key
//     }
//     const value = values[locale]
//     if (!value) {
//         return key
//     }
//     return value
// }

const changeClick = () => {
    const nowLocale = _autoi18n.locale
    console.log(nowLocale)
    if (nowLocale === 'zh') {
        _autoi18n.locale = 'en'
    } else {
        _autoi18n.locale = 'zh'
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