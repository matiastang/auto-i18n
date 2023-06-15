/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 23:06:46
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-15 23:06:50
 * @Description: global.d.ts
 */
/* eslint-disable */
declare module '*.vue' {
    import type { DefineComponent } from 'vue'
    const component: DefineComponent<{}, {}, any>
    export default component
}

declare global {
    interface Window {
        webkitRequestAnimationFrame: any
        mozRequestAnimationFrame: any
        Math: any
    }
}
