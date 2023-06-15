/*
 * @Author: matiastang
 * @Date: 2022-03-18 17:27:11
 * @LastEditors: matiastang
 * @LastEditTime: 2022-03-18 17:49:37
 * @FilePath: /datumwealth-front-scaffold/src/pinia/useTest.ts
 * @Description:
 */
import { defineStore, store } from 'pinia'

interface State {
    stateName: string
    name: string
    age: string
    user: {
        name: string
        age: number
        phone: string
    }
}

export const useTestStore = defineStore('auth/test', {
    state: (): State => ({
        stateName: 'test',
        name: 'a',
        age: 'b',
        user: {
            name: 'c',
            age: 29,
            phone: '18380449615',
        },
    }),
    actions: {
        setName(name: string) {
            this.name = name
        },
    },
})
