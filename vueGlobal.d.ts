/*
 * @Author: matiastang
 * @Date: 2023-07-13 18:43:06
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-13 19:37:10
 * @FilePath: /auto-i18/vueGlobal.d.ts
 * @Description: Vue类型声明
 */
import { ComponentCustomProperties } from "@vue/runtime-core";

declare module 'vue' {
  interface ComponentCustomProperties {
    $translate: (key: string) => string
    $changeLocale: (loacle: 'en' | 'zh' | 'ja') => void
  }
}

// 必须导出，才能在其他文件中使用
export default ComponentCustomProperties