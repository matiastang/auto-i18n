<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-21 17:34:45
 * @FilePath: /auto-i18n/src/views/home/i18Home.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <Header></Header>
        <div>{{ $translate('你好') }}</div>
        <!-- <div>{{ localeTranslate('你好') }}</div> -->
    </div>
</template>
<script setup lang="ts">
// import { inject } from 'vue'
import Header from '../Components/Header/Header.vue'
// import { Autoi18nMessages, Autoi18n } from '../../autoi18n/type'

// const autoi18n = inject<Autoi18n>('$autoi18n')

// const localeMessages: Autoi18nMessages = {
//     '你好': {
//         zh: '你好，世界',
//         en: 'hello world',
//         ja: 'こんにちは、世界',
//     }
// }

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

</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: calc(100vh - 60px);
    padding: 32px;
    background: white;

    .title {
        display: flex;
        align-items: center;

        .item {
            margin: 0px 16px;
        }
    }
}
</style>