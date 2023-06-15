<!--
 * @Author: matiastang
 * @Date: 2021-12-13 10:12:56
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-15 23:29:22
 * @FilePath: /datumwealth-front-scaffold/src/views/NotFound.vue
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
import { toggleTheme } from '@/style/utils/themes/index'
import cssVars from 'css-vars-ponyfill'

const text = ref('404')
console.log(style.red)

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
