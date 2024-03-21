/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-21 15:15:00
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
import { InputOptions } from 'rollup'
// import { InputOptions, ModuleInfo, LogLevel, RollupLog, AcornNode, OutputOptions } from 'rollup'
import { checkQuestions, devTransformMessages, devInjectMessages, devTransformMethod, readTranslateJson, writeTranslateJson } from './utils'
import { Autoi18nData, Autoi18nMessages } from './type'
import { TranslateTarget } from './enum'
import { merge } from 'lodash'
import path from 'path'
import zhipuaiTranslate from './translate/zhipuai'

const autoi18nData: Autoi18nData = {
    locale: TranslateTarget.ZH,
    locales: [TranslateTarget.ZH, TranslateTarget.EN],
    messages: {}
}

export enum TranslateType {
    /**
     * 智谱
     */
    ZHIPU_AI = 'zhipuai'
}

export interface ZhipuaiConfig {
    api_key: string
}

export interface Autoi18nPluginOptions {
    filePath?: string,
    isDev?: Boolean,
    locale?: TranslateTarget,
    locales?: TranslateTarget[],
    translateType?: TranslateType,
    zhipuaiConfig?: ZhipuaiConfig,
    translate?: (questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages) => Promise<Autoi18nMessages | null>
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
    const local = autoi18nData.locale
    const locals = autoi18nData.locales
    const cacheMessages = autoi18nData.messages
    const tos = locals.filter(item => item !== local)
    if (tos.length <= 0) {
        return code
    }
    let messages = await translate(list, tos, local, cacheMessages)
    // console.log('============1')
    // console.log(messages)
    if (messages) {
        autoi18nData.isTranslate = true
        merge(cacheMessages, messages)
    } else {
        messages = cacheMessages
    }
    if (!autoi18nData.isDev) {
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
    import { Autoi18nType, Autoi18nMessages, Autoi18nMessageItem, Autoi18nMessageValue } from '@autoi18n/type'

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

const autoi18nPlugin = (autoi18nOptions: Autoi18nPluginOptions) => {
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
            console.info('buildEnd', autoi18nData.messages)
            // const translate = options?.translate
            // if (translate) {
            //     translate(Array.from(questions))
            // }
            const isTranslate = autoi18nData.isTranslate
            if (!isTranslate) {
                return
            }
            const filePath = autoi18nOptions.filePath || path.resolve(__dirname, './translate.json')
            // const url = path.resolve(__dirname, './translate.json')
            const success = await writeTranslateJson(filePath, autoi18nData.messages)
            console.info(`写入${success}`)
        },
        /**
         * 构建开始
         */
        async buildStart(options: InputOptions) {
            console.info('buildStart')
            const filePath = autoi18nOptions.filePath || path.resolve(__dirname, './translate.json')
            // const url = path.resolve(__dirname, './translate.json')
            const fileContent = await readTranslateJson(filePath)
            console.info(filePath, fileContent)
            const configLocal = autoi18nOptions.locale
            if (configLocal) {
                autoi18nData.locale = configLocal
            }
            const configLocals = autoi18nOptions.locales
            if (configLocals) {
                autoi18nData.locales = configLocals
            }
            autoi18nData.isDev = autoi18nOptions.isDev
            autoi18nData.messages = fileContent
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
            if (id.endsWith('.vue'))  {
                debugger
                // 转换类型
                const translateType = autoi18nOptions.translateType
                // 智谱ai
                if (translateType === TranslateType.ZHIPU_AI) {
                    const zhipuaiConfig = autoi18nOptions.zhipuaiConfig
                    if (!zhipuaiConfig) {
                        console.warn('autoi18n plugin zhipuai config is null')
                        return null
                    }
                    const translate = async (questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages) => {
                        return await zhipuaiTranslate(zhipuaiConfig.api_key, questions, tos, from, cache)
                    }
                    const res = await devTransformModule(code, id, translate)
                    return res
                }
                // 外部函数转换
                const res = await devTransformModule(code, id, autoi18nOptions.translate)
                return res
            }
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