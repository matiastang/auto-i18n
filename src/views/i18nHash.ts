/*
 * @Author: matiastang
 * @Date: 2026-08-25 10:00:00
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-25 10:00:00
 * @FilePath: /auto-i18n/src/views/i18nHash.ts
 * @Description: 哈希 Key 演示辅助——必须放在 .ts 文件中：
 * 插件会给包含翻译调用的 .vue 模块注入同名 import，.vue 内再引入会重名冲突
 */
import { translateHashKey } from 'auto-i18n-vue'

/**
 * 计算文案的翻译哈希 Key
 * @param text 文案
 * @returns 形如 autoi18n_xxx 的哈希 Key
 */
export const demoHashKey = (text: string) => {
    return translateHashKey(text)
}
