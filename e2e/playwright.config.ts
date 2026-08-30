/*
 * @FilePath: /auto-i18n/e2e/playwright.config.ts
 * @Description: Playwright e2e 配置——复用演示应用 dev server（vite.config.ts，端口 3001）
 */
import { defineConfig } from '@playwright/test'

export default defineConfig({
    testDir: './specs',
    timeout: 30_000,
    fullyParallel: true,
    forbidOnly: !!process.env.CI,
    retries: process.env.CI ? 2 : 0,
    reporter: [['list']],
    use: {
        baseURL: 'http://localhost:3001',
    },
    webServer: {
        command: 'pnpm dev',
        url: 'http://localhost:3001',
        timeout: 120_000,
        // 本地复用已启动的 dev server；CI 中始终新起，保证干净环境
        reuseExistingServer: !process.env.CI,
    },
})
