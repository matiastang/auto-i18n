<!--
 * @FilePath: /auto-i18n/tests/integration/fixtures/app/src/Hello.vue
 * @Description: 集成测试夹具组件（含 $translate 调用，供 autoi18nPlugin transform）
-->
<template>
    <div class="hello">
        <p class="t1">{{ $translate(`你好，世界`) }}</p>
        <p class="t2">{{ $translate(`欢迎你，{name}`, { name: '访客' }) }}</p>
        <p class="t3">{{ fixed }}</p>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'

const fixed = computed(() => {
    return '普通文案不需要翻译'
})
</script>
<style scoped>
.hello {
    color: #333;
}
</style>
