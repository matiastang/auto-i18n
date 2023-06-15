<!--
 * @Author: matiastang
 * @Date: 2021-12-29 10:52:57
 * @LastEditors: matiastang
 * @LastEditTime: 2022-05-11 09:30:23
 * @FilePath: /datumwealth-front-scaffold/src/views/home/Home.vue
 * @Description: 
-->
<template>
    <div class="home">
        <div class="text">{{ text }}</div>
        <div class="body">{{ text }}</div>
        <input v-model="inputText" @change="inputChange" />
    </div>
</template>
<script setup lang="ts">
import { ref, watch } from 'vue'
import { useAuthUserStore, useTestStore } from '@/pinia/init'

const testStore = useTestStore()
console.log(testStore)

const store = useAuthUserStore()
console.log(store)
store.userId = 'auth userId'
// console.log(store.userId)
// console.log(store.$state.hello)
// console.log(store.$state.name)
// console.log(store.$state.age)

store.$state.hello = 'hello dw'
// console.log(store.$state.hello)

testStore.userId = 'test userId'
// console.log(testStore.userId)
// console.log(testStore.$state.hello)
// console.log(testStore.$state.name)
// console.log(testStore.$state.age)

const text = ref('home')

const inputText = ref(store.$state.name)
watch(
    () => inputText.value,
    (newValue, oldValue) => {
        store.$state.name = newValue
        store.$state.user.name = newValue
    }
)
watch(
    () => store.$state.name,
    (newValue, oldValue) => {
        console.log(`name newValue=${newValue}`)
        console.log(`name oldValue=${oldValue}`)
    }
)
const inputChange = (payload: Event) => {
    console.log(payload)
}
</script>

<style lang="stylus" scoped>
/*
* 全局变量：`$size`
*/
//使用别名@路径引入报错
// @import "@/common/stylus/test.styl"
/*
如果是`webpack`打包则可以使用`@import "~@/common/stylus/test.styl"`。
原因：CSS loader 会把把非根路径的url解释为相对路径， 加~前缀才会解释成模块路径。
*/
// 使用相对路径导入成功，如变量`$testColor`
@import "../../common/stylus/test.styl"
.home
    display: flex
    justify-content: center
    align-items: center
    & .text
        font-size: $size
        color: #bfbfbf
        line-height: 20px
        text-align: center
    & .body
        // color: $testColor
        color: var(--themeColor);
</style>
