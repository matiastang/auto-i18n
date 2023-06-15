/*
 * @Author: tangdaoyong
 * @Date: 2023-06-15 22:55:07
 * @LastEditors: tangdaoyong
 * @LastEditTime: 2023-06-15 23:32:59
 * @Description: vite配置文件
 */
// node路径
import path from 'path'
// vite
import { defineConfig } from 'vite'
// 解析.vue文件
import vue from '@vitejs/plugin-vue'


// import config from './loadenv'

import Inspect from 'vite-plugin-inspect'
import _package from './package.json'

export default defineConfig(({ mode }) => {
    return {
        // 共享配置
        plugins: [
            vue(),
            Inspect(),
        ],
        resolve: {
            // 别名
            alias: [
                { find: 'root', replacement: path.resolve(__dirname, './') },
                { find: '@', replacement: path.resolve(__dirname, './src') },
                { find: '@static', replacement: path.resolve(__dirname, './src/static') },
                { find: '@store', replacement: path.resolve(__dirname, './src/store') },
                { find: '@utils', replacement: path.resolve(__dirname, './src/utils') },
            ],
        },
        css: {
            modules: {
                /**
                 * generateScopedName和hashPrefix申明了，使用cssModules时样式的名称转换
                 */
                generateScopedName: '[name]-[local]-[hash:base64:6]',
                hashPrefix: 'prefix',
                localsConvention: 'camelCaseOnly',
            },
            // CSS 预处理器的选项
            preprocessorOptions: {
                less: {
                    additionalData: '@import "@/style/less/index.less";',
                    // 支持内联 JavaScript
                    javascriptEnabled: true,
                },
                scss: {
                //     additionalData: `
                //     @use "@/style/scss/element-variables.scss" as * ;
                //     @use "@/style/scss/index.scss" as * ;
                // `,
                    additionalData: `@use "@/style/scss/index.scss" as * ;`,
                },
                sass: {},
                stylus: {
                    additionalData: '@import "../src/style/stylus/index.styl";',
                },
            },
        },
        // 开发服务配置
        server: {
            host: '0.0.0.0',
            port: 3001,
            strictPort: true,
            fs: {
                strict: false,
            },
            // proxy: {
            //     // 选项写法
            //     [config.VITE_APP_BASE_API]: {
            //         target: config.VITE_APP_BASE_HOST, // 所要代理的目标地址
            //         rewrite: (path) => path.replace(/^\/dev-api/, ''), // 重写传过来的path路径，比如 `/api/index/1?id=10&name=zs`（注意:path路径最前面有斜杠（/），因此，正则匹配的时候不要忘了是斜杠（/）开头的；选项的 key 也是斜杠（/）开头的）
            //         changeOrigin: true, // true/false, Default: false - changes the origin of the host header to the target URL
            //     },
            // },
        },
        // 构建配置
        build: {
            outDir: mode === 'production' ? `dist_${_package.version}` : 'dist',
        },
    }
})
