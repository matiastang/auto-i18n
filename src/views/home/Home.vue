<!--
 * @Author: matiastang
 * @Date: 2021-12-29 10:52:57
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-29 22:52:16
 * @FilePath: /datumwealth-front-scaffold/src/views/home/Home.vue
 * @Description: 
-->
<template>
    <div class="page">
        <div v-for="item in routerList" :key="item.name" @click="() => itemAction(item)" class="item">{{ item.name }}</div>
    </div>
</template>
<script setup lang="ts">
import { ref, reactive } from 'vue'
import { useRouter } from 'vue-router'

const router = useRouter()

interface RouterItem {
    name: string
    path: string
}

const routerList = reactive<RouterItem[]>([
    {
        path: '/helloWebGPU',
        name: 'Hello WebGPU',
    },
    {
        path: '/triangleWebGPU',
        name: '三角形',
    },
    {
        path: '/colorTriangleWebGPU',
        name: '动态三角形',
    },
    {
        path: '/rotatingCube',
        name: '旋转立方体',
    },
    {
        path: '/cubes',
        name: '多个旋转立方体',
    }
])

const itemAction = (item: RouterItem) => {
    router.push(item.path)
}

</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    padding: 32px;
    background: var(--bg-color);
    .item {
        padding: 12px;
        border-radius: 8px;
        margin: 8px 0px;
        background: var(--container-bg-color);
        color: white;
        cursor: pointer;
    }
    
    .item:first-child {
        margin-top: 0px;
    }
    
    .item:last-child {
        margin-bottom: 0px;
    }
}
</style>
