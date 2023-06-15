/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 23:06:26
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-15 23:06:30
 * @Description: env环境变量
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
    readonly VITE_APP_BASE_API: string
    readonly VITE_APP_BASE_HOST: string
    VUE_APP_BUILD_TIME: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
