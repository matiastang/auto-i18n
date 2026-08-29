<!--
 * @Author: matiastang
 * @Date: 2023-08-07 15:16:56
 * @LastEditors: matiastang
 * @LastEditTime: 2023-08-07 16:07:19
 * @FilePath: /auto-i18n/src/Components/HeaderLayout/HeaderLayout.vue
 * @Description: HeaderLayout
-->
<template>
    <div class="header-layout" :dir="layoutDir">
        <Header class="header"></Header>
        <div class="header-layout-content">
            <router-view></router-view>
        </div>
    </div>
</template>

<script setup lang="ts">
import { computed, inject } from 'vue'
import Header from '../Header/Header.vue'
import { Autoi18nInfo } from 'auto-i18n-vue/dist/@types'

// 阿拉伯语等 RTL 语言自动切换页面方向
const autoi18n = inject<Autoi18nInfo>('$autoi18n')
const layoutDir = computed(() => {
    return autoi18n?.locale === 'ara' ? 'rtl' : 'ltr'
})
</script>

<style lang="scss" scoped>
.header-layout {
    width: 100vw;
    height: 100vh;
    .header {
        width: 100%;
    }
    .header-layout-content {
        width: 100%;
        height: calc(100% - 54px);
        align-items: stretch;
        overflow-y: scroll;
    }
}
</style>
