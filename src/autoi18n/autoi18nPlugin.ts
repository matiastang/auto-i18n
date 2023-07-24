/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-24 11:20:07
 * @FilePath: /auto-i18n/src/autoi18n/autoi18nPlugin.ts
 * @Description: htmlPlugin
 */
import { InputOptions, ModuleInfo, LogLevel, RollupLog, AcornNode, OutputOptions } from 'rollup'
import { LocaleType, Autoi18nMessages, Autoi18nMessageItem } from './type'
let questions = new Set<string>()

/**
 * 检查key
 * @param code 
 * @returns 
 */
const checkQuestions = (code: string) => {
    const RE = /\$translate\((.*)\)/g
    const translates = code.match(RE)
    if (!Array.isArray(translates) || translates.length <= 0) {
        return []
    }
    const questions = translates.map((item) => {
        const textRE = /\$translate\([',"]{1,}(.*)[',"]{1,}\)/g
        const textRes = textRE.exec(item)
        if (textRes.length > 1) {
            return textRes[1]
        }
        return null
    }).filter((item) => item)
    return questions
}

/**
 * 转换映射内容
 * @param msg 
 */
const devTransformMessages = (msg: Autoi18nMessages) => {
    const localTransform = (info: Autoi18nMessageItem) => {
        return Object.entries(info).reduce((left, item) => {
            const [key, value] = item
            return left + `    ${key}: '${value}',\n`
        }, '{\n') + '  },\n'
    }
    return Object.entries(msg).reduce((left, item) => {
        const [key, value] = item
        return left + `  ${key}: ${localTransform(value)}`
    }, '{\n') + '}\n'
}

/**
 * 注入
 * @param code 
 * @param msg 
 */
const devInjectMessages = (code: string, msg: string) => {
    return code.replace(/(\<script.*\>)/, `$1\n${msg}\n`)
}

/**
 * 转换方法替换
 * @param code 
 * @returns 
 */
const devTransformMethod = (code: string) => {
    return code.replace(/\$translate\([',"]{1,}(.*)[',"]{1,}\)/g, `localeTranslate('$1')`)
}

/**
 * dev 开发转换
 * @param code 
 * @param id 
 */
const devTransformModule = async (code: string, id: string, locales: LocaleType[], translate?: (questions: string[], tos: LocaleType[], from: LocaleType) => Promise<Autoi18nMessages>) => {
    let mQuestions = new Set<string>()
    checkQuestions(code).forEach((question) => {
        mQuestions.add(question)
    })
    const list = Array.from(mQuestions)
    if (list.length <= 0) {
        return code
    }
    // const messages = {
    //     '你好': {
    //         zh: '你好，世界',
    //         en: 'hello world',
    //         ja: 'こんにちは、世界',
    //     }
    // } as Autoi18nMessages
    const messages = await translate(list, ['en'], 'zh')
    const msgText = devTransformMessages(messages)
    const autoi18nInject = `
        import { inject } from 'vue'
        import { Autoi18nMessages, Autoi18n } from '@autoi18n/type'
        
        const autoi18n = inject<Autoi18n>('$autoi18n')

        const localeMessages = ${msgText}

        const localeTranslate = (key: string) => {
            const locale = autoi18n.locale
            const values = localeMessages[key]
            console.log(locale, values)
            if (!values) {
                return key
            }
            const value = values[locale]
            if (!value) {
                return key
            }
            return value
        }
    `
    const injectMsgCode = devInjectMessages(code, autoi18nInject)
    const replaceMethodCode = devTransformMethod(injectMsgCode)
    // console.log(replaceMethodCode)
    // const translate = options?.translate
            // if (translate) {
            //     translate(Array.from(questions))
            // }
    return replaceMethodCode
}

const autoi18nPlugin = (options: {
    locales?: LocaleType[],
    translate?: (questions: string[], tos: LocaleType[], from: LocaleType) => Promise<Autoi18nMessages>
} = {
    locales: ['zh', 'en']
}) => {
    return {
        name: 'html-transform',
        version: '0.0.1',
        /**
         * vite hook
         * @param html 
         * @returns 
         */
        async transformIndexHtml(html: string) {
            console.log('transformIndexHtml')
            return html.replace(
            /<title>(.*?)<\/title>/,
            `<title>autoi18n</title>`,
            )
        },
        /**
         * --------- 构建 ---------
         */
        /**
         * 构建完成，构建阶段的最后一个钩子
         */
        async buildEnd(error?: Error) {
            console.log('buildEnd', questions)
            // const translate = options?.translate
            // if (translate) {
            //     translate(Array.from(questions))
            // }
        },
        /**
         * 构建开始
         */
        async buildStart(options: InputOptions) {
            console.log('buildStart')
        },
        /**
         * 观察器进程即将关闭时通知插件
         */
        async closeWatcher() {

        },
        /**
         * 加载
         * @param id 
         * @returns 
         */
        async load(id: string) {
            console.log('load')
            if (id === 'virtual-module') {
              // "virtual-module"的源代码
              return 'export default "This is virtual!"';
            }
            return null; // 其他ID应按通常方式处理
        },
        /**
         * 每次 Rollup 完全解析一个模块时，都会调用此钩子
         * @param moduleInfo 
         */
        async moduleParsed(moduleInfo: ModuleInfo) {
            console.log('moduleParsed', moduleInfo)
        },
        onLog(level: LogLevel, log: RollupLog) {
            console.log('onLog')
            return null
        },
        /**
         * 这是构建阶段的第一个钩子
         * @param options 
         * @returns 
         */
        async options(options: InputOptions) {
            console.log('options')
            return options
        },
        /**
         * 动态导入定义自定义解析器
         * @param specifier 
         * @param importer 
         * @param options 
         */
        async resolveDynamicImport(
            specifier: string | AcornNode,
            importer: string,
            options: {
                assertions: Record<string, string>
            }
        ) {
            console.log('resolveDynamicImport')
            return null
        },
        /**
         * 定义一个自定义解析器
         * @param source 
         * @param importer 
         * @param options 
         * @returns 
         */
        async resolveId(
            source: string,
            importer: string | undefined,
            options: {
                assertions: Record<string, string>;
                custom?: { [plugin: string]: any };
                isEntry: boolean;
            }
        ) {
            console.log('resolveId')
            // console.log(source, importer, options)
            if (source === 'virtual-module') {
                // 这表示 rollup 不应询问其他插件或
                // 从文件系统检查以找到此 ID
                return source;
            }
            return null // 其他ID应按通常方式处理
        },
        async shouldTransformCachedModule(options: {
            ast: AcornNode;
            code: string;
            id: string;
            meta: { [plugin: string]: any };
            moduleSideEffects: boolean | 'no-treeshake';
            syntheticNamedExports: boolean | string;
        }) {
            console.log('shouldTransformCachedModule', options.id)
            return true
        },
        /**
         * 用于转换单个模块
         * @param code 
         * @param id 
         * @returns 
         */
        async transform(code: string, id: string) {
            // console.log('transform：', id)
            // id.endsWith('main.ts') || 
            if (id.endsWith('i18Home.vue') || id.endsWith('Header.vue'))  {
                console.log('transform：', id)
                const res = await devTransformModule(code, id, options.locales, options.translate)
                console.log(res)
                return res
                // console.log(code)
                // getQuestions(code).forEach((question) => {
                //     questions.add(question)
                // })
            }
            // if (id.endsWith('message.ts')) {
            //     // console.log(code)
            //     return setMessages(code)
            // }
            return null
            
        },
        /**
         * 在 --watch 模式下，每当 Rollup 检测到监视文件的更改时，就会通知插件
         * @param id 
         * @param change 
         */
        async watchChange(id: string, change: {event: 'create' | 'update' | 'delete'}) {

        },
        /**
         * --------- 输出 ---------
         */
        /**
         * 为每个 Rollup 输出块调用。返回 falsy 值不会修改哈希值
         * @param chunkInfo
         * @returns 
         */
        augmentChunkHash(chunkInfo: any) {
            console.log('augmentChunkHash')
            return 'falsy'
        },
        // banner: string | ((chunk: ChunkInfo) => string)
        // async banner() {}
        // closeBundle: () => Promise<void> | void
        // async closeBundle() {}
        // AssetInfo | ChunkInfo
        async generateBundle(options: OutputOptions, bundle: { [fileName: string]: any }, isWrite: boolean) {
            console.log('generateBundle')
            // // 省略一些边界情况的处理
            // // 1. 获取打包后的文件
            // const files = getFiles(bundle);
            // // 2. 组装 HTML，插入相应 meta、link 和 script 标签
            // const source = await template({ attributes, bundle, files, meta, publicPath, title});
            // // 3. 通过上下文对象的 emitFile 方法，输出 html 文件
            // const htmlFile: EmittedAsset = {
            //     type: 'asset',
            //     source,
            //     name: 'Rollup HTML Asset',
            //     fileName
            // }
            // this.emitFile(htmlFile)
        }
    }
}

// export default defineConfig({
//     plugins: [
//     ]
// })

export default autoi18nPlugin