<!--
 * @FilePath: /auto-i18n/tests/integration/fixtures/scan-app/src/Mixed.vue
 * @Description: 混合写法集成夹具——显式 $translate/autoTranslate 与零标记文案共存（US3）
-->
<template>
    <div class="mixed">
        <p class="explicit">{{ $translate(`显式文案标题`) }}</p>
        <p class="zero">零标记文案段落</p>
        <p class="both">{{ $translate(`两种写法同款文案`) }}</p>
        <p class="zero-both">{{ bothLabel }}</p>
        <p class="interp">{{ $translate(`显式插值：{name}`, { name: '访客' }) }}</p>
    </div>
</template>
<script setup lang="ts">
import { autoTranslate } from 'auto-i18n-vue'

const bothLabel = autoTranslate(`两种写法同款文案`)
const zeroLabel = '零标记脚本文案'
</script>
