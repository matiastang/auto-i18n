/*
 * @FilePath: /auto-i18n/tests/integration/fixtures/app/src/main.ts
 * @Description: 集成测试夹具入口（被 vite build 使用，运行时只读）
 */
import { createApp } from 'vue'
import Hello from './Hello.vue'

createApp(Hello).mount('#app')
