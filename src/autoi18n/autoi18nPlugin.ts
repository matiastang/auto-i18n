/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-26 23:30:00
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
import { InputOptions } from 'rollup'
import { parse as parseSfc } from '@vue/compiler-sfc'
import { checkQuestions, devInjectMessages, devTransformMethod, devTransformMessages, translateHashKey } from './utils'
import { Autoi18nMessages } from './@types/autoi18n'
import { Autoi18nPluginConfig, Autoi18nPluginInfo, TranslateFunction } from './@types/autoi18nPlugin'
import { TranslateTarget } from './@types/enum'
import { resolveTranslateFunction } from './translates/provider'
import { scanScript } from './scan/scriptScan'
import { scanTemplate } from './scan/templateScan'
import { rewriteSfc, RewriteInjectAt } from './scan/rewrite'
import { findScriptIgnoreMarks } from './scan/ignore'
import { IgnoreRange, ZeroMarkHit } from './scan/types'

/**
 * 插件版本号（发布时须与根 package.json 同步；
 * 不能静态 import package.json——ts:build 的 rootDir 为 src/autoi18n，越界导入会报 TS6059）
 */
const AUTOI18N_PLUGIN_VERSION = '0.2.0'
// 新译文落盘的防抖间隔：异常退出（kill/崩溃）最多丢失该时间窗内的翻译
const SAVE_DEBOUNCE_MS = 3000

/**
 * transform 结果：零标记改写发生时返回带 hires sourcemap 的对象，
 * 否则保持既有字符串契约（dev 的显式路径字符串级操作不产出 map）
 */
type ModuleTransformResult = string | null | { code: string; map: unknown }

/**
 * 深度合并翻译缓存：逐条叠加（保留既有语言的值，补入新语言），等价原 lodash.merge 的使用面
 */
const mergeMessages = (base: Autoi18nMessages, patch: Autoi18nMessages): Autoi18nMessages => {
    for (const [key, item] of Object.entries(patch)) {
        base[key] = { ...base[key], ...item }
    }
    return base
}

/**
 * 零标记扫描单个 SFC：parse 失败或非完整 SFC 请求安全返回 null（零标记跳过、显式管线照常）
 * @param code 模块源码
 */
const scanSfcModule = (code: string): { hits: ZeroMarkHit[] } | null => {
    let descriptor: ReturnType<typeof parseSfc>['descriptor']
    try {
        descriptor = parseSfc(code).descriptor
    } catch {
        return null
    }
    const hits: ZeroMarkHit[] = []
    const scriptBlocks = [descriptor.scriptSetup, descriptor.script]
    for (const block of scriptBlocks) {
        if (!block) {
            continue
        }
        // 块内容 loc.start.offset 即模块级偏移（开标签之后）；
        // script 忽略标记以块内局部偏移传入，覆盖语句区间由扫描器解析（contracts C-3）
        hits.push(...scanScript(block.content, block.loc.start.offset, findScriptIgnoreMarks(block.content)).hits)
    }
    if (descriptor.template?.ast) {
        // 仅当注入的 _autoScanTranslate 对模板表达式可见时才改写模板文案：
        // - 有 <script setup>（或纯模板 SFC——注入经追加的 setup 块承载）→ setup 绑定暴露给模板 ✓
        // - 仅有普通 <script>（Options API）→ 模板表达式编译为 _ctx.*，模块级注入
        //   不在其上，改写会导致渲染期 "not a function" 崩溃——保守跳过（文案回退
        //   原文），Options API 模板文案请用显式 $translate（全局属性）
        if (descriptor.scriptSetup || !descriptor.script) {
            hits.push(...scanTemplate(code, descriptor.template.ast).hits)
        }
    }
    return { hits }
}

/**
 * 解析零标记注入位置：无 script 块的 SFC 末尾追加 <script setup> 承载注入代码；
 * 有则注入到首个 script 开标签之后（块内容起点，与 devInjectMessages 位置语义一致）
 * @param code 模块源码
 */
const resolveInjectAt = (code: string): RewriteInjectAt => {
    const match = /<script[^>]*>/.exec(code)
    if (!match) {
        return { index: code.length, appendScript: true }
    }
    return { index: match.index + match[0].length, appendScript: false }
}

/**
 * dev 开发转换（运行在插件闭包状态上）
 * @param code
 * @param id
 */
const createDevTransformModule =
    (
        autoi18nPluginInfo: Autoi18nPluginInfo,
        scheduleSave: () => void,
    ) =>
    async (code: string, id: string, translate: TranslateFunction) => {
        const texts = checkQuestions(code)
        // 零标记扫描：仅处理完整 SFC 主请求（plugin-vue 拆分子请求带 query，其 code
        // 非完整 SFC，parse 会失败——显式管线对这些请求保持既有行为）；
        // exclude 命中的文件跳过零标记扫描（显式管线不受影响，FR-007）
        const isSfcSubRequest = id.includes('?')
        const scanEnabled = autoi18nPluginInfo.autoScan !== false
        // 统一正斜杠，保证 exclude 的 'src/generated' 类规则在 Windows 反斜杠 id 下同样命中
        const filePath = id.split('?')[0].replace(/\\/g, '/')
        const excluded = (autoi18nPluginInfo.exclude ?? []).some((rule) =>
            typeof rule === 'string' ? filePath.includes(rule) : rule.test(filePath)
        )
        const scan = !isSfcSubRequest && scanEnabled && !excluded ? scanSfcModule(code) : null
        const zeroHits = scan?.hits ?? []
        const merged = new Set([...texts, ...zeroHits.map((hit) => hit.text)])
        const list = Array.from(merged)
        if (list.length <= 0) {
            return code
        }
        const local = autoi18nPluginInfo.locale
        const targets = autoi18nPluginInfo.targets
        const cacheMessages = autoi18nPluginInfo.messages
        const tos = targets.filter(item => item !== local)
        if (tos.length <= 0) {
            return code
        }
        let messages: Autoi18nMessages | null = null
        try {
            messages = await translate(list, tos, local, cacheMessages)
        } catch (error) {
            // 任何翻译源抛错都不得中断构建（FR-007）
            console.warn('autoi18n：翻译执行异常，跳过本模块新增翻译', error)
            messages = null
        }
        if (messages) {
            autoi18nPluginInfo.isTranslate = true
            mergeMessages(cacheMessages, messages)
            scheduleSave()
            // 注入用消息表改取"缓存 ∪ 新增"，修复混合模块下已缓存文案被漏注入的问题
            messages = cacheMessages
        } else {
            messages = cacheMessages
        }
        // 子集注入：只内联本模块涉及文案的译文，避免每个模块都携带全量翻译表；
        // 以"缓存 ∪ 新增"为源，混合模块下已缓存的旧文案也能被正常命中
        const moduleMessages: Autoi18nMessages = {}
        for (const text of list) {
            const key = translateHashKey(text)
            const item = messages[key]
            if (item) {
                moduleMessages[key] = item
            }
        }
        // 零标记改写与注入：dev 与 production 均执行（research.md R5）——
        // 生产构建若无查表调用，裸中文将原样上屏；显式路径不受影响（FR-008）
        let output = code
        let rewriteMap: unknown | null = null
        if (zeroHits.length > 0) {
            const rewritten = rewriteSfc({
                source: code,
                hits: zeroHits,
                messages: moduleMessages,
                injectAt: resolveInjectAt(code),
            })
            output = rewritten.code
            rewriteMap = rewritten.map
        }
        if (!autoi18nPluginInfo.isDev) {
            // dev 的字符串级显式注入/替换不参与，map 与零标记改写精确对应
            return rewriteMap ? { code: output, map: rewriteMap } : output
        }
        // 注入代码运行在接入方项目中：只能导入接入方必然可解析的模块（'vue' 与本包 'auto-i18n-vue'），
        // 不能使用仓库内 @autoi18n 别名（仅本仓库 demo 配置了该别名，第三方项目无此别名必然解析失败）
        const autoi18nInject = `
    import { inject } from 'vue'
    import { translateHashKey } from 'auto-i18n-vue'

    const _autoi18n = inject('$autoi18n')

    const _localeMessages = ${devTransformMessages(moduleMessages)}

    const _localeTranslate = (key, options) => {
        if (!_autoi18n) {
            // 运行时插件未安装：回退原文而不是抛 TypeError
            return key
        }
        const locale = _autoi18n.locale
        const localeKey = translateHashKey(key)
        const item = _localeMessages[localeKey]
        if (!item) {
            return key
        }
        const value = item[locale]
        if (!value) {
            return key
        }
        if (options) {
            return Object.entries(options).reduce((left, item) => {
                const [_key, _val] = item
                return String(left).replaceAll('{' + _key + '}', () => String(_val))
            }, value)
        }
        return value
    }
    `
        const injectMsgCode = devInjectMessages(output, autoi18nInject)
        const replaceMethodCode = devTransformMethod(injectMsgCode)
        return replaceMethodCode
    }

/**
 * autoi18n vite 插件
 * 状态随每次调用独立创建（可安全多实例）；之前为模块级单例，多构建互相污染
 * @param config
 * @returns
 */
export const autoi18nPlugin: (config: Autoi18nPluginConfig) => {
    name: string;
    enforce: 'pre';
    version: string;
    buildEnd(error?: Error): Promise<void>;
    buildStart(options: InputOptions): Promise<void>;
    transform(code: string, id: string): Promise<ModuleTransformResult>;
} = (config: Autoi18nPluginConfig) => {
    /**
     * 插件设置信息（每次调用独立实例）
     */
    const autoi18nPluginInfo: Autoi18nPluginInfo = {
        locale: TranslateTarget.ZH,
        targets: [TranslateTarget.ZH, TranslateTarget.EN],
        messages: {},
        autoScan: true
    }

    let saveTimer: ReturnType<typeof setTimeout> | undefined

    /**
     * 落盘当前全部译文（try/catch 兜底，不中断构建）
     */
    const persistMessages = async () => {
        const writeTranslateJson = config.saveTranslateContent
        if (!writeTranslateJson) {
            return
        }
        try {
            const status = await writeTranslateJson(autoi18nPluginInfo.messages)
            console.info(`保存翻译内容${status ? '成功' : '失败'}`)
        } catch (error) {
            console.error('saveTranslateContent error', error)
        }
    }

    /**
     * 防抖落盘：dev/watch 模式下新增译文后短窗口合并写入，
     * 构建进程崩溃时丢失窗口不超过 SAVE_DEBOUNCE_MS；buildEnd 会取消挂起定时器并同步写一次
     */
    const scheduleSave = () => {
        if (!config.saveTranslateContent) {
            return
        }
        if (saveTimer !== undefined) {
            clearTimeout(saveTimer)
        }
        saveTimer = setTimeout(() => {
            saveTimer = undefined
            void persistMessages()
        }, SAVE_DEBOUNCE_MS)
    }

    const devTransformModule = createDevTransformModule(autoi18nPluginInfo, scheduleSave)

    return {
        name: 'autoi18n-plugin',
        // 必须先于用户/官方插件处理：@vitejs/plugin-vue 会把 SFC 拆分为编译产物，
        // 后置只能拿到无法按源码提取的派生代码（静默失效）
        enforce: 'pre',
        version: AUTOI18N_PLUGIN_VERSION,
        /**
         * 构建完成，构建阶段的最后一个钩子
         */
        async buildEnd(error?: Error) {
            // 取消挂起的防抖写并立即持久化一次，保证退出前不丢数据也不重复写
            if (saveTimer !== undefined) {
                clearTimeout(saveTimer)
                saveTimer = undefined
            }
            const isTranslate = autoi18nPluginInfo.isTranslate
            if (!isTranslate) {
                return
            }
            await persistMessages()
        },
        /**
         * 构建开始
         */
        async buildStart(options: InputOptions) {
            // 不打印原始 config——其中包含 aiModelConfig 的 apiKey，会泄漏到终端与 CI 日志
            console.info('buildStart', {
                locale: config.locale,
                targets: config.targets,
                translateSource: config.translate
                    ? 'custom'
                    : config.aiModelConfig
                      ? String(config.aiModelConfig.model)
                      : 'free',
            })
            const readTranslateJson = config.readTranslateContent
            if (readTranslateJson) {
                try {
                    const fileContent = await readTranslateJson()
                    autoi18nPluginInfo.messages = fileContent ?? {}
                } catch (error) {
                    console.error('readTranslateJson error', error)
                }
            } else {
                console.warn('readTranslateContent is not defined')
            }
            const configLocal = config.locale
            if (configLocal) {
                autoi18nPluginInfo.locale = configLocal
            }
            const configTargets = config.targets
            if (configTargets) {
                autoi18nPluginInfo.targets = configTargets
            }
            autoi18nPluginInfo.isDev = config.isDev
        // 零标记扫描默认开启（FR-010），显式配置 false 时插件等价 v0.1.0 行为
        autoi18nPluginInfo.autoScan = config.autoScan !== false
        autoi18nPluginInfo.exclude = config.exclude ?? []
        },
        /**
         * 用于转换单个模块
         * @param code
         * @param id
         * @returns
         */
        async transform(code: string, id: string) {
            // 容忍 vite 附加的资源 query（如 xxx.vue?vue&type=template）
            const filePath = id.split('?')[0]
            if (!filePath.endsWith('.vue')) {
                return null
            }
            // 三级优先级调度：自定义 translate > LLM（aiModelConfig）> 免费三方翻译（默认）
            const translate = resolveTranslateFunction(config)
            const res = await devTransformModule(code, id, translate)
            return res
        },
    }
}
