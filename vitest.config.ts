/*
 * @FilePath: /auto-i18n/vitest.config.ts
 * @Description: Vitest 配置（单元/集成/Use Case 三层，e2e 由 Playwright 承担）
 */
import path from 'path'
import { defineConfig } from 'vitest/config'

export default defineConfig({
    test: {
        // 仅 Vitest 三层测试；e2e/ 目录由 Playwright 管理，不在此列
        include: ['tests/**/*.{test,spec}.ts'],
        // 默认 Node 环境（Vite 插件侧真实运行态）；需要 DOM 的用例在文件头用
        // `// @vitest-environment jsdom` 单文件切换
        environment: 'node',
        setupFiles: ['tests/setup.ts'],
        // 集成测试会执行一次完整 vite build，放宽超时
        testTimeout: 120_000,
        hookTimeout: 120_000,
    },
    resolve: {
        alias: [
            {
                find: '@autoi18n',
                replacement: path.resolve(__dirname, './src/autoi18n'),
            },
        ],
    },
})
