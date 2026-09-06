<!--
 * @FilePath: /auto-i18n/tests/integration/fixtures/scan-app/src/OptionsApi.vue
 * @Description: Options API（普通 script）夹具——模板文案保守跳过、script 字面量照常改写
-->
<template>
    <div class="options">
        <p>Options 模板文案</p>
        <p>{{ optionsLabel }}</p>
    </div>
</template>
<script>
export default {
    data() {
        return {
            optionsLabel: 'Options 脚本文案'
        }
    }
}
</script>
