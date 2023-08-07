<!--
 * @Author: matiastang
 * @Date: 2021-12-13 10:12:56
 * @LastEditors: matiastang
 * @LastEditTime: 2023-08-07 15:37:15
 * @FilePath: /auto-i18n/src/views/NotFound.vue
 * @Description: 404页面
-->
<template>
    <div :class="['not-found', style.red]">
        <div class="text" @click="changeTheme">{{ text }}</div>
        <div class="theme-test">{{ text }}</div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import style from '@/style/cssModules/index.module.css'
import cssVars from 'css-vars-ponyfill'

const text = ref('404')

const changeTheme = () => {
    // toggleTheme('darkly')
    cssVars({
        preserveStatic: false,
        variables: {
            '--themeColor': '#FFAB48',
        },
    })
}
</script>

<style lang="scss" scoped>
.not-found {
    width: 100vw;
    height: 100vh;
    display: flex;
    justify-content: center;
    align-items: center;
    .text {
        font-size: fontSize(14px);
        @include defaultFont;
        color: $placeholderColor;
        line-height: 20px;
        text-align: center;
    }
    .theme-test {
        color: var(--themeColor);
    }
}
</style>
