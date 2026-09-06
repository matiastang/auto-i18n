<!--
 * @FilePath: /auto-i18n/tests/integration/fixtures/scan-app/src/Protected.vue
 * @Description: 误判防护集成夹具——属性访问器/对象键/注释/忽略标记（FR-005/FR-006）
-->
<template>
    <div class="protected">
        <p>{{ conf['中文属性名'] }}</p>
        <p>{{ protectedLabel }}</p>
        <p>{{ protectedObj.label }}</p>
    </div>
</template>
<script setup lang="ts">
/* autoi18n-ignore */
const protectedLabel = '忽略标记覆盖的文案'
const protectedObj = { label: '正常翻译的对象值文案' }
const conf = { '中文属性名': '值' }
</script>
