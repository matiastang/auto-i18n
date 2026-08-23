/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 18:28:48
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
// import path from 'path'
import { merge } from 'lodash'
import { InputOptions } from 'rollup'
// import { InputOptions, ModuleInfo, LogLevel, RollupLog, AcornNode, OutputOptions } from 'rollup'
import { checkQuestions, devTransformMessages, devInjectMessages, devTransformMethod } from './utils'
import { Autoi18nMessages } from './@types/autoi18n'
import { Autoi18nPluginConfig, Autoi18nPluginInfo, TranslateFunction } from './@types/autoi18nPlugin'
import { TranslateTarget } from './@types/enum'
import { resolveTranslateFunction } from './translates/provider'
// import * as __package from '../../package.json'

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
const devTransformModule = async (code: string, id: string, translate: TranslateFunction) => {
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
export const autoi18nPlugin: (config: Autoi18nPluginConfig) => {
    name: string;
    version: string;
    buildEnd(error?: Error): Promise<void>;
    buildStart(options: InputOptions): Promise<void>;
    transform(code: string, id: string): Promise<string>;
} = (config: Autoi18nPluginConfig) => {
    return {
        name: 'autoi18n-plugin',
        version: '0.0.3',
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
            const writeTranslateJson = config.saveTranslateContent
            console.log(typeof writeTranslateJson)
            if (!writeTranslateJson) {
                return
            }
            // const filePath = autoi18nPluginInfo.filePath || path.resolve(__dirname, './translate.json')
            // // const url = path.resolve(__dirname, './translate.json')
            // const success = await writeTranslateJson(filePath, autoi18nPluginInfo.messages)
            // console.info(`写入${success}`)
            try {
                const status = await writeTranslateJson(autoi18nPluginInfo.messages)
                console.info(`保存翻译内容${status ? '成功' : '失败'}`)
            } catch (error) {
                console.error('saveTranslateContent error', error)
            }
        },
        /**
         * 构建开始
         */
        async buildStart(options: InputOptions) {
            console.info('buildStart', config)
            // console.info(options)
            // const filePath = config.filePath || path.resolve(__dirname, './translate.json')
            // const url = path.resolve(__dirname, './translate.json')
            // console.info(`filePath=${filePath}`)
            const readTranslateJson = config.readTranslateContent
            console.log(typeof readTranslateJson)
            if (readTranslateJson) {
                try {
                    const fileContent = await readTranslateJson()
                    autoi18nPluginInfo.messages = fileContent
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
            // 三级优先级调度：自定义 translate > LLM（aiModelConfig）> 免费三方翻译（默认）
            const translate = resolveTranslateFunction(config)
            const res = await devTransformModule(code, id, translate)
            return res
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