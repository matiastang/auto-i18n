<!--
 * @FilePath: /auto-i18n/tests/integration/fixtures/scan-app/src/ZeroMark.vue
 * @Description: 零标记集成夹具组件——不含任何显式翻译调用，四类文案位置齐备
-->
<template>
    <div class="zero">
        <h1 class="title">零标记标题</h1>
        <p class="interp">{{ '零标记插值' }}</p>
        <input class="input" :placeholder="'零标记占位'" />
        <button class="btn" @click="toast('零标记提示')">{{ label }}</button>
    </div>
</template>
<script setup lang="ts">
const label = '零标记脚本文案'
const toast = (msg: string) => msg
</script>
