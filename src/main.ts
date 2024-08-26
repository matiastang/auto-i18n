/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 22:54:49
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-26 16:19:41
 * @Description: main.ts
 */
// import path from 'path'
import { createApp } from 'vue'
import App from '@/App.vue'
import router from '@/router'
import { createPinia } from 'pinia'
import { piniaPersistedState } from 'matias-pinia-persisted-state'
import _package from '../package.json'

// 本地测试
// import { autoi18n } from './autoi18n'
// import { TranslateTarget } from './autoi18n/@types/enum'

// 本地打包测试
import { autoi18n, TranslateTarget } from 'root/dist/index.es.js'

// npm包测试
// import { autoi18n, TranslateTarget } from 'autoi18n'

// import {createI18n} from 'vue-i18n'
// import messages from './autoi18n/message'

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

// const messages = {
//     zh: {
//         hello: '你好，世界',
//         switch: '切换',
//     },
//     en: {
//         hello: 'hello world',
//         switch: 'switch',
//     },
//     ja: {
//         hello: 'こんにちは、世界',
//         switch: 'swit换',
//     }
// }
// const filePath = path.resolve(__dirname, './public/translate.json')
// console.info(filePath)

app.use(autoi18n, {
    filePath: '/translate.json',
    // filePath: './public/translate.json',
    // filePath,
    locale: TranslateTarget.ZH,
    targets: [TranslateTarget.ZH, TranslateTarget.EN, TranslateTarget.JP, TranslateTarget.ARA],
})

// app.use(createI18n({  
//   locale: 'en', // 默认语言为英语  
//   fallbackLocale: 'en', // 如果当前语言没有相应的翻译，则使用fallbackLocale  
//   messages,  
// }))

// 挂载
app.mount('#app')

// 卸载应用
// window.unmount = () => {
//     console.log('window.unmount')
//     app.unmount()
// }

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
