/*
 * @FilePath: /auto-i18n/e2e/specs/home.spec.ts
 * @Description: 演示应用首页 e2e——验证 autoi18n 端到端链路（插件转换 + translate.json 加载 + 渲染）
 *
 * 断言以中文文案为准：locale 为 zh 时译文即原文，且缓存未命中时回退原文，
 * 因此断言在"有/无 API Key"两种环境下均稳定（离线可运行）。
 */
import { expect, test } from '@playwright/test'

test.describe('演示应用首页', () => {
    test('页面渲染翻译后的中文文案', async ({ page }) => {
        await page.goto('/#/')
        // dev 模式为 hash 路由
        await expect(page).toHaveURL(/#\/$/)
        // 翻译仓库检查器表格也展示原文，用 .first() 精确匹配交互区元素
        await expect(page.getByText('个人介绍').first()).toBeVisible()
        // 插值文案（公司名来自 autoTranslate 运行时调用）
        await expect(page.getByText(/公司名称：/).first()).toBeVisible()
        await expect(page.getByText(/用户名：user\d+/)).toBeVisible()
    })

    test('点击"切换用户"更新用户名', async ({ page }) => {
        await page.goto('/#/')
        const username = page.getByText(/用户名：user\d+/)
        await expect(username).toBeVisible()
        const before = await username.textContent()

        // 随机数可能撞旧值（1/100），最多点 5 次确保变化
        for (let i = 0; i < 5; i++) {
            await page.getByRole('button', { name: '切换用户' }).click()
            const current = await username.textContent()
            if (current !== before) {
                break
            }
        }
        await expect(username).not.toHaveText(before ?? '')
        // 交互后其余文案仍正常渲染
        await expect(page.getByText('个人介绍').first()).toBeVisible()
    })
})
