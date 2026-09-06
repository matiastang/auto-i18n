/*
 * @FilePath: /auto-i18n/tests/integration/fixtures/scan-app/src/main.ts
 * @Description: 零标记集成夹具入口（被 vite build 使用，运行时只读）
 */
import { createApp } from 'vue'
import ZeroMark from './ZeroMark.vue'

createApp(ZeroMark).mount('#app')
