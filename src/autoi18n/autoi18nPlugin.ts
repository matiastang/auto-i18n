/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-26 23:30:00
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
import { InputOptions } from 'rollup'
import { checkQuestions, devInjectMessages, devTransformMethod, devTransformMessages, translateHashKey } from './utils'
import { Autoi18nMessages } from './@types/autoi18n'
import { Autoi18nPluginConfig, Autoi18nPluginInfo, TranslateFunction } from './@types/autoi18nPlugin'
import { TranslateTarget } from './@types/enum'
import { resolveTranslateFunction } from './translates/provider'

/**
 * 插件版本号（发布时须与根 package.json 同步；
 * 不能静态 import package.json——ts:build 的 rootDir 为 src/autoi18n，越界导入会报 TS6059）
 */
const AUTOI18N_PLUGIN_VERSION = '0.0.3'
// 新译文落盘的防抖间隔：异常退出（kill/崩溃）最多丢失该时间窗内的翻译
const SAVE_DEBOUNCE_MS = 3000

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
        const mQuestions = new Set(texts)
        const list = Array.from(mQuestions)
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
        if (!autoi18nPluginInfo.isDev) {
            return code
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
        const msgText = devTransformMessages(moduleMessages)
        // 注入代码运行在接入方项目中：只能导入接入方必然可解析的模块（'vue' 与本包 'auto-i18n-vue'），
        // 不能使用仓库内 @autoi18n 别名（仅本仓库 demo 配置了该别名，第三方项目无此别名必然解析失败）
        const autoi18nInject = `
    import { inject } from 'vue'
    import { translateHashKey } from 'auto-i18n-vue'

    const _autoi18n = inject('$autoi18n')

    const _localeMessages = ${msgText}

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
        const injectMsgCode = devInjectMessages(code, autoi18nInject)
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
    transform(code: string, id: string): Promise<string | null>;
} = (config: Autoi18nPluginConfig) => {
    /**
     * 插件设置信息（每次调用独立实例）
     */
    const autoi18nPluginInfo: Autoi18nPluginInfo = {
        locale: TranslateTarget.ZH,
        targets: [TranslateTarget.ZH, TranslateTarget.EN],
        messages: {}
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
