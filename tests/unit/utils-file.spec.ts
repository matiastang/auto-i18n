/*
 * @FilePath: /auto-i18n/tests/unit/utils-file.spec.ts
 * @Description: src/autoi18n/utils/file.ts 单元测试（Node fs 分支 + XHR readJsonFile）
 */
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import path from 'node:path'
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest'
import {
    readJsonFile,
    readTranslateJson,
    writeTranslateJson,
} from '../../src/autoi18n/utils/file'
import { Autoi18nMessageItem, Autoi18nMessages } from '../../src/autoi18n/@types/autoi18n'

let tempDir: string

beforeEach(async () => {
    tempDir = await mkdtemp(path.join(tmpdir(), 'autoi18n-test-'))
})

afterEach(async () => {
    await rm(tempDir, { recursive: true, force: true })
})

describe('readTranslateJson / writeTranslateJson（Node fs 分支）', () => {
    it('写入后可读回相同内容', async () => {
        const file = path.join(tempDir, 'translate.json')
        const data: Autoi18nMessages = {
            autoi18n_key1: { zh: '你好', en: 'Hello' } as Autoi18nMessageItem,
        }
        const success = await writeTranslateJson(file, data)
        expect(success).toBe(true)
        // 磁盘上是合法 JSON
        const raw = await readFile(file, 'utf-8')
        expect(JSON.parse(raw)).toEqual(data)
        // 读回内存
        expect(await readTranslateJson(file)).toEqual(data)
    })

    it('空文件返回空对象', async () => {
        const file = path.join(tempDir, 'empty.json')
        await writeFile(file, '', 'utf-8')
        expect(await readTranslateJson(file)).toEqual({})
    })

    it('非法 JSON 返回空对象', async () => {
        const file = path.join(tempDir, 'bad.json')
        await writeFile(file, '{ not json', 'utf-8')
        expect(await readTranslateJson(file)).toEqual({})
    })

    it('文件不存在时 reject（由调用方兜底）', async () => {
        const file = path.join(tempDir, 'not-exist.json')
        await expect(readTranslateJson(file)).rejects.toBeTruthy()
    })

    it('浏览器环境 reject 且不写文件', async () => {
        // 恢复为 undefined 使 typeof window === 'undefined'（Node 分支），
        // 不用 unstubAllGlobals——那会把 setup.ts 中的 require stub 一并清掉
        vi.stubGlobal('window', {})
        await expect(
            writeTranslateJson(path.join(tempDir, 'never.json'), {})
        ).resolves.toBe(false)
        vi.stubGlobal('window', undefined)
    })
})

describe('readJsonFile（XHR 分支，stub XMLHttpRequest）', () => {
    let scenario: { status: number; body: string }

    class FakeXHR {
        status = 0
        readyState = 0
        responseText = ''
        onreadystatechange: (() => void) | null = null
        overrideMimeType() {}
        open() {}
        send() {
            this.readyState = 4
            this.status = scenario.status
            this.responseText = scenario.body
            this.onreadystatechange?.()
        }
    }

    beforeEach(() => {
        scenario = { status: 200, body: '{}' }
        vi.stubGlobal('XMLHttpRequest', FakeXHR)
    })

    it('200 且合法 JSON：resolve 解析结果', async () => {
        scenario = { status: 200, body: '{"autoi18n_k1":{"zh":"你好"}}' }
        await expect(readJsonFile('/translate.json')).resolves.toEqual({
            autoi18n_k1: { zh: '你好' },
        })    })

    it('非 200：reject', async () => {
        scenario = { status: 404, body: '' }
        await expect(readJsonFile('/translate.json')).rejects.toBeTruthy()
    })

    it('200 但非法 JSON：reject', async () => {
        scenario = { status: 200, body: '{ oops' }
        await expect(readJsonFile('/translate.json')).rejects.toBeTruthy()
    })
})
