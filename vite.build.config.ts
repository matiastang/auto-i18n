/*
 * @Author: matiastang
 * @Date: 2021-12-30 15:37:18
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-16 17:50:05
 * @FilePath: /auto-i18n/vite.build.config.ts
 * @Description: npm 打包上传配置
 */
// vite配置文件vite.config.js

// node路径
import path from 'path'
// vite
import { defineConfig } from 'vite'
// 代码压缩
import { terser } from 'rollup-plugin-terser'

export default defineConfig({
    // 插件
    plugins: [terser()],
    // 库模式
    build: {
        lib: {
            entry: path.resolve(__dirname, './src/autoi18n/index.ts'),
            name: 'autoi18n',
            formats: ['es', 'cjs', 'umd', 'iife'],
            fileName: (format) => `index.${format}.js`,
        },
        sourcemap: true, // 构建后是否生成 source map 文件。
        // 自定义底层的 Rollup 打包配置。这与从 Rollup 配置文件导出的选项相同，并将与 Vite 的内部 Rollup 选项合并。查看 Rollup 选项文档 获取更多细节。
        rollupOptions: {
            // 确保外部化处理那些你不想打包进库的依赖
            external: ['vue'],
            output: {
                // 在 UMD 构建模式下为这些外部化的依赖提供一个全局变量
                globals: {
                    pinia: 'vue',
                },
            },
        },
    },
})
