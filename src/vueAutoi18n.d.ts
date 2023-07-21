/*
 * @Author: matiastang
 * @Date: 2023-07-13 18:43:06
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-21 14:54:34
 * @FilePath: /auto-i18n/src/vueAutoi18n.d.ts
 * @Description: Vue类型声明
 */
// import { ComponentCustomProperties } from '@vue/runtime-core'
import { Autoi18n, Autoi18nTranslate } from './autoi18n/type'

declare module 'vue' {
  interface ComponentCustomProperties {
    $autoi18n: Autoi18n
    $translate: Autoi18nTranslate
  }
}

/*
如果Vue中Vetur报错提示：
Property '$autoi18n' does not exist on type 'ComponentPublicInstance<{}, {}, {}, {}, {}, {}, {}, {}, false, ComponentOptionsBase<any, any, any, any, any, any, any, any, any, {}, {}, string, {}>, {}, {}>'.Vetur(2339)
则可以设置Vetur不校验Script
*/

// export {}

// 必须导出，才能在其他文件中使用
// export default ComponentCustomProperties