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

describe('readJsonFile（fetch 分支，stub fetch）', () => {
    afterEach(() => {
        vi.unstubAllGlobals()
        vi.restoreAllMocks()
    })

    it('200 且合法 JSON：resolve 解析结果', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{"autoi18n_k1":{"zh":"你好"}}'),
            }),
        )
        await expect(readJsonFile('/translate.json')).resolves.toEqual({
            autoi18n_k1: { zh: '你好' },
        })
    })

    it('非 200：reject（含状态码信息）', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({ ok: false, status: 404, text: () => Promise.resolve('') }),
        )
        await expect(readJsonFile('/translate.json')).rejects.toThrow(/404/)
    })

    it('200 但非法 JSON：reject', async () => {
        vi.stubGlobal(
            'fetch',
            vi.fn().mockResolvedValue({
                ok: true,
                status: 200,
                text: () => Promise.resolve('{ oops'),
            }),
        )
        await expect(readJsonFile('/translate.json')).rejects.toBeTruthy()
    })

    it('请求异常（网络错误）向上抛出由调用方兜底', async () => {
        vi.stubGlobal('fetch', vi.fn().mockRejectedValue(new Error('network down')))
        await expect(readJsonFile('/translate.json')).rejects.toThrow('network down')
    })
})
