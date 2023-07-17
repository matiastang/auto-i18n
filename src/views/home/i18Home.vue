<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-14 19:34:12
 * @FilePath: /auto-i18n/src/views/home/i18Home.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <div @click="changeClick">切换</div>
        <div>{{ $translate('hello') }}</div>

        <div @click="switchLanguage">切换1</div>
        <div>{{ $t('hello') }}</div>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance, inject } from 'vue'

const appProxy = getCurrentInstance().proxy

const autoi18n = inject<any>('$autoi18n')

const changeClick = () => {
    const nowLocale = appProxy.$autoi18n.locale
    console.log(nowLocale, autoi18n.locale)
    if (nowLocale === 'zh') {
        appProxy.$autoi18n.locale = 'en'
    } else if (nowLocale === 'en') {
        appProxy.$autoi18n.locale = 'ja'
    } else {
        appProxy.$autoi18n.locale = 'zh'
    }
}

const switchLanguage = () => {
    const nowLocale = appProxy.$i18n.locale
    if (nowLocale === 'zh') {
        appProxy.$i18n.locale = 'en'
    } else if (nowLocale === 'en') {
        appProxy.$i18n.locale = 'ja'
    } else {
        appProxy.$i18n.locale = 'zh'
    }
}
</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    padding: 32px;
    background: white;
}
</style>