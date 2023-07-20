/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-20 18:03:24
 * @FilePath: /auto-i18n/src/vitePlugin/htmlPlugin.ts
 * @Description: htmlPlugin
 */
let questions = new Set<string>()

const getQuestions = (code: string) => {
    const RE = /\$translate\((.*)\)/g
    const translates = code.match(RE)
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

const setMessages = (code: string) => {
    return code.replace(/let autoi18nMessages = {};/g, `
        let autoi18nMessages = {
            '工作台': 'Workbench',
            '基金圈：机构圈01': 'Fund Circle: Institutional Circle 01',
            '投研模板': 'Investment Research Template',
            '况客推荐': 'Situation Customer Recommendation',
            '切换': 'Switching',
            '你好': 'Hello'
        }
    `)

}

const htmlPlugin = (options?: {
    translate?: (questions: string[]) => void
}) => {
    return {
        name: 'html-transform',
        version: '0.0.1',
        transformIndexHtml(html) {
            return html.replace(
            /<title>(.*?)<\/title>/,
            `<title>autoi18n</title>`,
            )
        },
        async transform(code, id: string) {
            // console.log(id)
            // id.endsWith('main.ts') || 
            if (id.endsWith('i18Home.vue'))  {
                // console.log(code)
                getQuestions(code).forEach((question) => {
                    questions.add(question)
                })
            }
            if (id.endsWith('message.ts')) {
                console.log(code)
                return setMessages(code)
            }
            return null
            
        },
        resolveId(source, importer, options) {
            console.log(source, importer, options)
            return null
        },
        async buildEnd() {
            console.log('buildEnd', questions)
            const translate = options?.translate
            if (translate) {
                translate(Array.from(questions))
            }
        },
        // async generateBundle(output: NormalizedOutputOptions, bundle: OutputBundle) {
        async generateBundle(output: any, bundle: any) {
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

export default htmlPlugin