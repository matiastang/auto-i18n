<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-18 15:52:39
 * @FilePath: /auto-i18n/src/views/home/i18Home.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <div class="title">
            <div class="item">{{ $translate(`你好，{name}`, {
                name: orgName
            }) }}</div>
            <div class="item">{{ $translate(`工作台`) }}</div>
            <div class="item">{{ $translate(`基金圈：{name}`, {
                name: orgName
            }) }}</div>
            <div class="item">{{ $translate('投研模板') }}</div>
            <div class="item">{{ $translate('况客推荐') }}</div>
            <div class="item">{{ $translate(`用户名：{name}`, {
                name: useName
            }) }}</div>
            <div class="item" @click="changeUser">{{ $translate('切换用户') }}</div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'
import { autoTranslate } from '@autoi18n/autoi18n'
import { Autoi18nMessageValue } from '@autoi18n/type'

const orgName = computed(() => {
    return autoTranslate('机构圈01')
})

const useName = ref('MT01')

const changeUser = () => {
    const id = Math.floor(Math.random() * 10)
    useName.value = `MT${id}`
}

// const info = reactive({
//     code: '60081'
// })

// onMounted(() => {
//     info.code = '60082'
// })

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
    height: 100%;
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