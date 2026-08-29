<!--
 * @Author: matiastang
 * @Date: 2023-07-21 15:14:42
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-25 10:00:00
 * @FilePath: /auto-i18n/src/Components/Header/Header.vue
 * @Description: Header
-->
<template>
    <div class="header">
        <div class="left">{{ $translate(`自动国际化`) }}</div>
        <div class="right">
            <div class="tip">{{ $translate(`点击语言即时切换`) }}</div>
            <div class="langs">
                <div
                    v-for="item in langList"
                    :key="item"
                    :class="['lang', { active: item === autoi18n.locale }]"
                    @click="changeLocale(item)"
                >{{ localeName(item) }}</div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, inject } from 'vue'
import { Autoi18nInfo } from 'auto-i18n-vue/dist/@types'

const autoi18n = inject<Autoi18nInfo>('$autoi18n')

// 目标语言列表来自插件运行时配置，响应式渲染
const langList = computed(() => {
    return autoi18n?.targets ?? []
})

// 各语言以其母语名称展示，切换前即可预览
const localeNames: { [key: string]: string } = {
    zh: '中文',
    en: 'English',
    jp: '日本語',
    ara: 'العربية',
    fra: 'Français',
}
const localeName = (target: string) => {
    return localeNames[target] ?? target
}

const changeLocale = (target: string) => {
    if (!autoi18n) {
        return
    }
    // 直接修改响应式 locale，全站文案即时更新，无需刷新
    autoi18n.locale = target as Autoi18nInfo['locale']
}
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

    .left {
        font-size: 17px;
        font-weight: 600;
        color: #303133;
    }

    .right {
        display: flex;
        align-items: center;

        .tip {
            margin-inline-end: 12px;
            font-size: 13px;
            color: #909399;
        }

        .langs {
            display: flex;
            align-items: center;
            gap: 8px;

            .lang {
                padding: 4px 12px;
                border-radius: 999px;
                border: 1px solid rgba(102, 103, 171, 0.45);
                font-size: 13px;
                color: #6667ab;
                cursor: pointer;
                user-select: none;
                transition: all 0.2s;

                &:hover {
                    background: rgba(102, 103, 171, 0.08);
                }

                &.active {
                    background: #6667ab;
                    border-color: #6667ab;
                    color: white;
                }
            }
        }
    }
}
</style>
