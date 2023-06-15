/*
 * @Author: matiastang
 * @Date: 2022-02-09 16:21:29
 * @LastEditors: matiastang
 * @LastEditTime: 2022-02-09 17:21:28
 * @FilePath: /datumwealth-front-scaffold/src/pinia/plugin.ts
 * @Description: pinia 插件
 */
import { PiniaPluginContext } from 'pinia'
import { ref } from 'vue'

const userID = ref('000001')
const hello = ref('hello pinia')

export function myPiniaPlugin(context: PiniaPluginContext) {
    // console.log(context.store.$state)
    context.store.userId = userID
    context.store.$state.hello = hello
    // context.store.$subscribe(() => {
    //     // react to store changes
    //     console.log('subscribe')
    //     console.log(context.store.$state)
    // })
    // context.store.$onAction(() => {
    //     // react to store actions
    //     console.log('onAction')
    //     console.log(context.store.$state)
    // })
}
