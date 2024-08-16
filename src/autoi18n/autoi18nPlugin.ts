/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-16 17:45:18
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
import path from 'path'
import { merge } from 'lodash'
import { InputOptions } from 'rollup'
// import { InputOptions, ModuleInfo, LogLevel, RollupLog, AcornNode, OutputOptions } from 'rollup'
import { checkQuestions, devTransformMessages, devInjectMessages, devTransformMethod, readTranslateJson, writeTranslateJson } from './utils'
import { Autoi18nMessages } from './@types/autoi18n'
import { Autoi18nPluginConfig, Autoi18nPluginInfo } from './@types/autoi18nPlugin'
import { TranslateTarget, TranslateAIModel } from './@types/enum'
import zhipuaiTranslate from './translates/zhipuai'

/**
 * 插件设置信息
 */
const autoi18nPluginInfo: Autoi18nPluginInfo = {
    locale: TranslateTarget.ZH,
    targets: [TranslateTarget.ZH, TranslateTarget.EN],
    messages: {}
}

/**
 * dev 开发转换
 * @param code 
 * @param id 
 */
const devTransformModule = async (code: string, id: string, translate?: (questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages) => Promise<Autoi18nMessages | null>) => {
    const texts = checkQuestions(code)
    let mQuestions = new Set(texts)
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
    let messages = await translate(list, tos, local, cacheMessages)
    // console.log('============1')
    // console.log(messages)
    if (messages) {
        autoi18nPluginInfo.isTranslate = true
        merge(cacheMessages, messages)
    } else {
        messages = cacheMessages
    }
    if (!autoi18nPluginInfo.isDev) {
        return code
    }
    // console.log('============2')
    // console.log(messages)
    const msgText = devTransformMessages(messages)
    // console.log('============3')
    // console.log(msgText)
    const autoi18nInject = `
    import { inject } from 'vue'
    import { translateHashKey } from '@autoi18n/utils'
    import { Autoi18nType, Autoi18nMessages, Autoi18nMessageItem, Autoi18nMessageValue } from '@autoi18n/@types/autoi18n'

    const _autoi18n = inject<Autoi18nType>('$autoi18n')

    const _localeMessages: Autoi18nMessages = ${msgText}

    const _localeTranslate = (key: string, options?: {[key: string]: string | number}) => {
        const locale = _autoi18n.locale
        const localeKey = translateHashKey(key)
        const item = _localeMessages[localeKey] as Autoi18nMessageItem
        if (!item) {
            return key
        }
        const value = item[locale] as Autoi18nMessageValue
        if (!value) {
            return key
        }
        if (options) {
            return Object.entries(options).reduce((left, item) => {
                const [_key, _val] = item
                return String(left).replaceAll('{' + _key + '}', _val)
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
 * @param config 
 * @returns 
 */
const autoi18nPlugin = (config: Autoi18nPluginConfig) => {
    return {
        name: 'autoi18n',
        version: '0.0.1',
        // /**
        //  * vite hook
        //  * @param html 
        //  * @returns 
        //  */
        // async transformIndexHtml(html: string) {
        //     console.info('transformIndexHtml')
        //     return html.replace(
        //     /<title>(.*?)<\/title>/,
        //     `<title>autoi18n</title>`,
        //     )
        // },
        /**
         * --------- 构建 ---------
         */
        /**
         * 构建完成，构建阶段的最后一个钩子
         */
        async buildEnd(error?: Error) {
            console.info('buildEnd', autoi18nPluginInfo.messages)
            // const translate = options?.translate
            // if (translate) {
            //     translate(Array.from(questions))
            // }
            const isTranslate = autoi18nPluginInfo.isTranslate
            if (!isTranslate) {
                return
            }
            const filePath = autoi18nPluginInfo.filePath || path.resolve(__dirname, './translate.json')
            // const url = path.resolve(__dirname, './translate.json')
            const success = await writeTranslateJson(filePath, autoi18nPluginInfo.messages)
            console.info(`写入${success}`)
        },
        /**
         * 构建开始
         */
        async buildStart(options: InputOptions) {
            console.info('buildStart')
            const filePath = config.filePath || path.resolve(__dirname, './translate.json')
            // const url = path.resolve(__dirname, './translate.json')
            const fileContent = await readTranslateJson(filePath)
            console.info(filePath, fileContent)
            const configLocal = config.locale
            if (configLocal) {
                autoi18nPluginInfo.locale = configLocal
            }
            const configTargets = config.targets
            if (configTargets) {
                autoi18nPluginInfo.targets = configTargets
            }
            autoi18nPluginInfo.isDev = config.isDev
            autoi18nPluginInfo.messages = fileContent
        },
        /**
         * 观察器进程即将关闭时通知插件
         */
        // async closeWatcher() {

        // },
        /**
         * 加载
         * @param id 
         * @returns 
         */
        // async load(id: string) {
        //     console.info('load')
        //     if (id === 'virtual-module') {
        //       // "virtual-module"的源代码
        //       return 'export default "This is virtual!"';
        //     }
        //     return null; // 其他ID应按通常方式处理
        // },
        /**
         * 每次 Rollup 完全解析一个模块时，都会调用此钩子
         * @param moduleInfo 
         */
        // async moduleParsed(moduleInfo: ModuleInfo) {
        //     console.info('moduleParsed', moduleInfo)
        // },
        // onLog(level: LogLevel, log: RollupLog) {
        //     console.info('onLog')
        //     return null
        // },
        /**
         * 这是构建阶段的第一个钩子
         * @param options 
         * @returns 
         */
        // async options(options: InputOptions) {
        //     console.info('options')
        //     return options
        // },
        /**
         * 动态导入定义自定义解析器
         * @param specifier 
         * @param importer 
         * @param options 
         */
        // async resolveDynamicImport(
        //     specifier: string | AcornNode,
        //     importer: string,
        //     options: {
        //         assertions: Record<string, string>
        //     }
        // ) {
        //     console.info('resolveDynamicImport')
        //     return null
        // },
        /**
         * 定义一个自定义解析器
         * @param source 
         * @param importer 
         * @param options 
         * @returns 
         */
        // async resolveId(
        //     source: string,
        //     importer: string | undefined,
        //     options: {
        //         assertions: Record<string, string>;
        //         custom?: { [plugin: string]: any };
        //         isEntry: boolean;
        //     }
        // ) {
        //     console.info('resolveId')
        //     if (source === 'virtual-module') {
        //         // 这表示 rollup 不应询问其他插件或
        //         // 从文件系统检查以找到此 ID
        //         return source;
        //     }
        //     return null // 其他ID应按通常方式处理
        // },
        // async shouldTransformCachedModule(options: {
        //     ast: AcornNode;
        //     code: string;
        //     id: string;
        //     meta: { [plugin: string]: any };
        //     moduleSideEffects: boolean | 'no-treeshake';
        //     syntheticNamedExports: boolean | string;
        // }) {
        //     console.info('shouldTransformCachedModule', options.id)
        //     return true
        // },
        /**
         * 用于转换单个模块
         * @param code 
         * @param id 
         * @returns 
         */
        async transform(code: string, id: string) {
            console.info('transform：', id)
            if (!id.endsWith('.vue')) {
                return null
            }
            const configTranslate = config.translate
            if (configTranslate) {
                // 外部函数转换
                const res = await devTransformModule(code, id, configTranslate)
                return res
            }
            const modelConfig = config.aiModelConfig
            if (!modelConfig) {
                console.warn('autoi18n plugin aiModelConfig is null')
                return null
            }
            const model = modelConfig.model
            // 智谱ai转换
            if (model === TranslateAIModel.ZHIPUAI) {
                const config = modelConfig.config
                if (!config) {
                    console.warn('autoi18n plugin zhipuai config is null')
                    return null
                }
                const translate = async (questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages) => {
                    return await zhipuaiTranslate(config.apiKey, questions, tos, from, cache)
                }
                const res = await devTransformModule(code, id, translate)
                return res
            }
            console.warn('autoi18n plugin aiModelConfig model is null')
            return null
        },
        /**
         * 在 --watch 模式下，每当 Rollup 检测到监视文件的更改时，就会通知插件
         * @param id 
         * @param change 
         */
        // async watchChange(id: string, change: {event: 'create' | 'update' | 'delete'}) {

        // },
        /**
         * --------- 输出 ---------
         */
        /**
         * 为每个 Rollup 输出块调用。返回 falsy 值不会修改哈希值
         * @param chunkInfo
         * @returns 
         */
        // augmentChunkHash(chunkInfo: any) {
        //     console.info('augmentChunkHash')
        //     return 'falsy'
        // },
        // banner: string | ((chunk: ChunkInfo) => string)
        // async banner() {}
        // closeBundle: () => Promise<void> | void
        // async closeBundle() {}
        // AssetInfo | ChunkInfo
        // async generateBundle(options: OutputOptions, bundle: { [fileName: string]: any }, isWrite: boolean) {
        //     console.info('generateBundle')
        //     // // 省略一些边界情况的处理
        //     // // 1. 获取打包后的文件
        //     // const files = getFiles(bundle);
        //     // // 2. 组装 HTML，插入相应 meta、link 和 script 标签
        //     // const source = await template({ attributes, bundle, files, meta, publicPath, title});
        //     // // 3. 通过上下文对象的 emitFile 方法，输出 html 文件
        //     // const htmlFile: EmittedAsset = {
        //     //     type: 'asset',
        //     //     source,
        //     //     name: 'Rollup HTML Asset',
        //     //     fileName
        //     // }
        //     // this.emitFile(htmlFile)
        // }
    }
}

export default autoi18nPlugin