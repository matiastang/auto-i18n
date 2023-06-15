/*
 * @Author: matiastang
 * @Date: 2022-02-09 16:28:32
 * @LastEditors: matiastang
 * @LastEditTime: 2022-02-09 16:36:48
 * @FilePath: /datumwealth-front-scaffold/src/pinia/customProperties.ts
 * @Description: store数据
 */
import 'pinia'
import { Ref } from 'vue'

declare module 'pinia' {
    export interface PiniaCustomProperties {
        // by using a setter we can allow both strings and refs
        set userId(value: string | Ref<string>)
        get userId(): string

        // you can define simpler values too
        simpleNumber: number
    }
}
