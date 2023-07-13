<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-13 19:59:20
 * @FilePath: /auto-i18/src/views/home/i18Home.vue
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
import { useRouter } from 'vue-router'

const i18Locale = inject('i18Locale')
const app = getCurrentInstance()
const proxy = app.proxy
console.log(app, proxy)
// const changeLocale = app.config.globalProperties.$changeLocale

const changeClick = () => {
    const old = app.proxy.$autoi18.locale
    app.proxy.$changeLocale(old === 'zh' ? 'en' : 'zh')
}

const switchLanguage = () => {
    const old = app.proxy.$i18n.locale
    console.log(old)
    app.proxy.$i18n.locale = old === 'zh' ? 'en' : 'zh'
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