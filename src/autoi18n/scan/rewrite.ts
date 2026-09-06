/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/rewrite.ts
 * @Description: 零标记改写与注入编排——magic-string 按命中位置改写并产出 sourcemap（research.md R3/R5）
 */
import MagicString from 'magic-string'
import { Autoi18nMessages } from '../@types/autoi18n'
import { escapeJsonForSfc } from '../utils/translate'
import { ZeroMarkHit } from './types'

/**
 * 注入位置：appendScript 为 true 时在源码末尾追加 <script setup> 承载注入代码
 * （无 script 块的 SFC）；否则在 index（首个 script 开标签结束处，即块内容起点）
 * 前插注入代码
 */
export interface RewriteInjectAt {
    index: number
    appendScript: boolean
}

export interface RewriteInput {
    /** 原 SFC 源码 */
    source: string
    /** 扫描命中（ignored 者防御性跳过） */
    hits: ZeroMarkHit[]
    /** 子集消息表（哈希键 → 词条），JSON 序列化后内嵌 */
    messages: Autoi18nMessages
    /** 注入位置；null 表示不注入 */
    injectAt: RewriteInjectAt | null
}

export interface RewriteOutput {
    code: string
    /** hires sourcemap；未发生任何改写/注入时为 null */
    map: unknown | null
}

/**
 * 注入代码的 import 语句：标识符全部 `_` 前缀且唯一，与既有显式路径注入的
 * `_localeTranslate`/`_autoi18n` 等命名隔离，混用模块不冲突（contracts C-2）。
 * 依赖面仅 'auto-i18n-vue'（接入方必然可解析），不使用 inject——普通 <script>
 * 顶层与 <script setup> 均可用，响应式由渲染期读取 autoi18nInfo.locale 建立
 */
const SCAN_INJECT_IMPORT =
    "import { autoi18nInfo as _autoi18nInfo, translateHashKey as _scanHashKey } from 'auto-i18n-vue'"

const buildInjectCode = (messages: Autoi18nMessages): string => {
    // 译文可能含引号/换行/`</script>`，经 escapeJsonForSfc 序列化（JSON 转义 + SFC 块边界防护）
    return `
    ${SCAN_INJECT_IMPORT}

    const _autoScanMessages = ${escapeJsonForSfc(messages)}

    const _autoScanTranslate = (key, options) => {
        const item = _autoScanMessages[_scanHashKey(key)]
        if (!item) {
            return key
        }
        const value = item[_autoi18nInfo.locale]
        if (!value) {
            return key
        }
        if (options) {
            return Object.entries(options).reduce((left, entry) => {
                const [_key, _val] = entry
                return String(left).replaceAll('{' + _key + '}', () => String(_val))
            }, value)
        }
        return value
    }
    `
}

/**
 * 文案转单引号字符串字面量：必须用单引号——命中可能位于 HTML 属性绑定值内
 * （如 :placeholder="…"，其外层定界符为双引号，内嵌双引号会破坏模板语法）。
 * 借 JSON.stringify 完成控制字符/反斜杠转义，再补转义单引号；JSON 转出的
 * \" 在单引号串中合法（等价字面双引号）
 */
const toSingleQuotedLiteral = (text: string): string => {
    const inner = JSON.stringify(text).slice(1, -1).replace(/'/g, "\\'")
    return `'${inner}'`
}

/**
 * 应用零标记改写与注入
 * 命中为空且无注入位置时原样返回（不生成 sourcemap）
 */
export const rewriteSfc = (input: RewriteInput): RewriteOutput => {
    const { source, hits, messages, injectAt } = input
    const active = hits.filter((hit) => !hit.ignored)
    if (active.length <= 0 && !injectAt) {
        return { code: source, map: null }
    }
    const magic = new MagicString(source)
    for (const hit of active) {
        const callText = `_autoScanTranslate(${toSingleQuotedLiteral(hit.text)})`
        if (hit.kind === 'text') {
            // 模板文本节点：整段替换为插值查表调用（HTML 折叠空白，排版不受影响）
            magic.overwrite(hit.start, hit.end, `{{ ${callText} }}`)
        } else {
            // 表达式/script 内字面量：整字面量（含引号）替换为调用表达式
            magic.overwrite(hit.start, hit.end, callText)
        }
    }
    if (injectAt) {
        const injectCode = buildInjectCode(messages)
        if (injectAt.appendScript) {
            magic.append(`\n<script setup>\n${injectCode}\n</script>\n`)
        } else {
            magic.appendRight(injectAt.index, `\n${injectCode}\n`)
        }
    }
    return {
        code: magic.toString(),
        map: magic.generateMap({ hires: true }),
    }
}
