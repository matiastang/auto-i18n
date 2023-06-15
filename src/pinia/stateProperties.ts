/*
 * @Author: matiastang
 * @Date: 2022-02-09 16:34:56
 * @LastEditors: matiastang
 * @LastEditTime: 2022-02-10 09:47:17
 * @FilePath: /datumwealth-front-scaffold/src/pinia/stateProperties.ts
 * @Description: 状态类型文件
 */
import 'pinia'
import { Ref } from 'vue'

declare module 'pinia' {
    export interface PiniaCustomStateProperties<S> {
        set hello(value: string | Ref<string>)
        get hello(): string
    }
}
