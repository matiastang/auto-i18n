/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 23:06:26
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-17 14:38:23
 * @Description: env环境变量
 */
/// <reference types="vite/client" />

interface ImportMetaEnv {
    VITE_APP_BUILD_TIME: string
}

interface ImportMeta {
    readonly env: ImportMetaEnv
}
