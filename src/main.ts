/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 22:54:49
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-14 15:01:23
 * @Description: main.ts
 */
import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router'
import { createPinia } from 'pinia'
import { piniaPersistedState } from 'matias-pinia-persisted-state'
import _package from '../package.json'
import autoi18n from './autoi18n'
import {createI18n} from 'vue-i18n'  

// 默认主题（如果是其他预编译样式可以配置vite默认导入）
import '@/style/themes/default.css'

const app = createApp(App)

// pinia
const pinia = createPinia()
pinia.use(piniaPersistedState)

// 加载pinia
app.use(pinia)

// 路由
app.use(router)

const messages = {
    zh: {
        hello: '你好，世界'
    },
    en: {
        hello: 'hello world'
    },
    ja: {
        hello: 'こんにちは、世界'
    }
}

app.use(autoi18n, {
    locale: 'zh',
    messages,
})

app.use(createI18n({  
  locale: 'en', // 默认语言为英语  
  fallbackLocale: 'en', // 如果当前语言没有相应的翻译，则使用fallbackLocale  
  messages,  
}))

// 挂载
app.mount('#app')

// import.meta.env.PROD
console.info(`当前Vue版本为${app.version}`)
const print = (key: string, value: string) =>
    console.log(
        `%c ${key} %c ${value} %c `,
        'background:#35495e ; padding: 1px; border-radius: 3px 0 0 3px;  color: #fff',
        'background:rgb(65, 184, 131) ;padding: 1px; border-radius: 0 3px 3px 0;  color: #fff; font-weight: bold;',
        'background:transparent'
    )
print(_package.name, _package.version)
// print('build time', `${import.meta.env.VITE_APP_BUILD_TIME}`)
