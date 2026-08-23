/*
 * @FilePath: /auto-i18n/tests/setup.ts
 * @Description: Vitest 全局 setup
 */
import { createRequire } from 'node:module'
import { vi } from 'vitest'

/**
 * src/autoi18n/utils/file.ts 的 Node 分支使用 require('fs')（源码注释：动态 require
 * 是为了避免 fs 进入浏览器打包产物）。Vitest 按 ESM 转换被测模块，模块作用域没有
 * require，这里以全局 stub 补齐，使 Node 文件读写分支可被真实执行。
 */
vi.stubGlobal('require', createRequire(import.meta.url))
