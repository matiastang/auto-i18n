<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-26 17:34:26
 * @FilePath: /auto-i18n/src/views/autoi18nHome.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <div class="list">
            <div class="item">
                <p class="text">{{ $translate(`个人介绍`) }}</p>
            </div>
            <div class="item">
                <p class="text">{{ $translate(`公司名称：{name}`, {
                    name: companyName,
                })}}</p>
            </div>
            <div class="item">
                <p class="text">{{ $translate(`用户名：{name}`, {
                    name: userName
                })}}</p>
                <div class="item" @click="changeUser">{{ $translate('切换用户') }}</div>
            </div>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref } from 'vue'

// 本地测试
// import { autoTranslate } from '@autoi18n/autoi18n'
// import { Autoi18nMessageValue } from '@autoi18n/type'

// npm包测试
import { autoTranslate } from 'auto-i18n-vue'

const companyName = computed(() => {
    return autoTranslate('西筹科技')
})

const userName = ref('user001')

const changeUser = () => {
    const id = Math.floor(Math.random() * 100)
    userName.value = `user${id}`
}
</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100%;
    padding: 32px;
    background: white;

    .list {
        display: flex;
        flex-direction: column;
        align-items: stretch;

        .item {
            display: flex;
            
            justify-content: space-between;
            align-items: center;
            margin: 0px 16px;

            .text {
                font-size: 16px;
            }
        }
    }
}
</style>