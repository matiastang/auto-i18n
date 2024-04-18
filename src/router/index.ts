/*
 * @Author: matiastang
 * @Date: 2021-12-28 19:31:46
 * @LastEditors: matiastang
 * @LastEditTime: 2024-04-18 16:37:02
 * @FilePath: /auto-i18n/src/router/index.ts
 * @Description: 路由
 */
import { createRouter, createWebHashHistory, createWebHistory, RouteRecordRaw } from 'vue-router'
// layout
import HeaderLayout from '@/Components/HeaderLayout/HeaderLayout.vue'
// web
import I18Home from '@/views/home/i18Home.vue'
import AiHome from '@/views/ai/index.vue'
// NotFound
import NotFound from '@/views/NotFound.vue'

const routes: Array<RouteRecordRaw> = [
    {
        path: '/',
        name: 'layout',
        component: HeaderLayout,
        children: [
            {
                path: '',
                name: 'home',
                component: I18Home,
            },
        ],
        beforeEnter: (to, from) => {
            console.log(`web路由卫士：即将从${from.path}跳转到${to.path}`)
            return true
        },
    },
    {
        path: '/ai',
        name: 'ai',
        component: AiHome,
    },
    {
        path: '/:pathMatch(.*)*', // 将匹配所有内容并将其放在 `$route.params.pathMatch` 下
        name: 'NotFound',
        // redirect: '/',
        component: NotFound,
    },
]
/**
 * 创建Router
 */
const router = createRouter({
    history: import.meta.env.DEV ? createWebHashHistory() : createWebHistory(),
    routes,
    scrollBehavior(to, from, savedPosition) {
        // 平滑滚动
        if (to.hash) {
            return {
                selector: to.hash,
                behavior: 'smooth',
            }
        }
        return { x: 0, y: 0 }
    },
})

/**
 * 全局前置守卫
 */
router.beforeEach((to, from, next) => {
    next()
})

/**
 * 全局解析守卫
 */
router.beforeResolve((to) => {
    console.log(`将要跳转到${to.path}`)
})

/**
 * 全局后置钩子
 */
router.beforeEach((to, from) => {
    console.log(`从${from.path}跳转到${to.path}`)
})

export default router
