<!--
 * @Author: matiastang
 * @Date: 2023-08-07 15:16:56
 * @LastEditors: matiastang
 * @LastEditTime: 2023-08-07 16:07:19
 * @FilePath: /auto-i18n/src/Components/HeaderLayout/HeaderLayout.vue
 * @Description: HeaderLayout
-->
<template>
    <div class="header-layout">
        <Header class="header"></Header>
        <div class="header-layout-content">
            <router-view></router-view>
        </div>
    </div>
</template>

<script setup lang="ts">
import Header from '../Header/Header.vue'
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
