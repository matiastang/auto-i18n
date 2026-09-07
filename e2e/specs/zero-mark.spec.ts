/*
 * @FilePath: /auto-i18n/e2e/specs/zero-mark.spec.ts
 * @Description: 零标记演示区块 e2e——无包裹文案随语言切换显示译文、忽略标记文案保持原文
 *
 * 断言的期望译文从 public/translate.json 读取（词条在需求实现阶段经免费源预生成），
 * 保证离线稳定、不硬编码译文。
 */
import { readFileSync } from 'node:fs'
import path from 'node:path'
import { expect, test } from '@playwright/test'
import { translateHashKey } from '../../src/autoi18n/utils/translate'

const messages = JSON.parse(
    readFileSync(path.resolve(__dirname, '../../public/translate.json'), 'utf-8')
) as { [key: string]: { [locale: string]: string } }

const enOf = (text: string): string => {
    const item = messages[translateHashKey(text)]
    expect(item?.en, `词条缺失：${text}`).toBeTruthy()
    return item!.en!
}

test.describe('零标记演示区块', () => {
    test('默认中文：零标记文案与忽略标记文案均渲染', async ({ page }) => {
        await page.goto('/#/')
        await expect(page.getByText('零标记文本节点文案')).toBeVisible()
        await expect(page.getByText('零标记插值文案')).toBeVisible()
        await expect(page.getByText('这串文案被忽略标记排除')).toBeVisible()
    })

    test('切换英语：零标记文案显示词条译文，忽略标记文案保持原文', async ({ page }) => {
        await page.goto('/#/')
        await page.getByText('English', { exact: true }).click()

        // 零标记文案（文本节点/插值/脚本字面量）显示 en 译文
        await expect(page.getByText(enOf('零标记文本节点文案'))).toBeVisible()
        await expect(page.getByText(enOf('零标记插值文案'))).toBeVisible()
        await expect(page.getByText(enOf('零标记脚本文案'))).toBeVisible()
        // 忽略标记覆盖的文案不参与翻译，切语言后保持原文
        await expect(page.getByText('这串文案被忽略标记排除')).toBeVisible()
    })
})
