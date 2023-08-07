/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 23:06:46
 * @LastEditors: matiastang
 * @LastEditTime: 2023-08-07 16:51:35
 * @Description: global.d.ts
 */
/* eslint-disable */
// import { Autoi18n, Autoi18nTranslate } from '@autoi18n/type'
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    // interface ComponentCustomProperties {
    //     $autoi18n: Autoi18n
    //     $translate: Autoi18nTranslate
    // }
    export default component
}

declare global {
    interface Window {
        webkitRequestAnimationFrame: any
        mozRequestAnimationFrame: any
        Math: any
    }
}
