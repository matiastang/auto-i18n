/*
 * @Author: matiastang
 * @Date: 2023-07-17 10:21:27
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-18 13:43:12
 * @FilePath: /auto-i18n/src/vitePlugin/htmlPlugin.ts
 * @Description: htmlPlugin
 */
// import {PluginOption} from 'vite'
import { defineConfig } from 'vite'; 
import CryptoJS from 'crypto-js'
// import fetch from 'node-fetch'
import axios from 'axios'

let questions = []
const answer = {
    
}

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

const baiduTranslate = (q: string) => {
    // src: "工作台&基金圈：机构圈01&投研模板&况客推荐"
    // dst: "Workbench&Fund Circle: Institutional Circle 01&Investment Research Template&Customer Recommendation"
    // const q = '工作台&基金圈：机构圈01&投研模板&况客推荐'
    const to = 'en'
    const appid = ''
    const salt = (new Date()).getTime()
    const sign = CryptoJS.MD5(appid + q + salt + '').toString()
    /*
    * 文档地址：https://fanyi-api.baidu.com/doc/21
    */
    const data = {
        q,
        from: 'auto',
        to,
        appid,
        salt,
        sign,
    }
    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate`
    // return axios.post(url, data, {
    //     headers: {
    //         'Content-Type': 'application/x-www-form-urlencoded'
    //     }
    // })
    return new Promise<any>((resolve, reject) => {
        setTimeout(() => {
            resolve({
                data: {
                    from: 'zh',
                    to: 'en',
                    trans_result: [
                      {
                        src: '工作台&基金圈：机构圈01&投研模板&况客推荐&切换&你好',
                        dst: 'Workbench&Fund Circle: Institutional Circle 01&Investment Research Template&Situation Customer Recommendation&Switching&Hello'
                      }
                    ]
                }
            })
        }, 500)
    })
    // return new Promise<any>((resolve, reject) => {
    //     fetch(url, {
    //         method: 'POST',
    //         headers: {
    //             'Content-Type': 'application/x-www-form-urlencoded'
    //         },
    //         body: new URLSearchParams(params),
    //     })
    //     .then((res) => {
    //         console.log(res)
    //         resolve(res)
    //     })
    //     .catch((err) => {
    //         console.log(err)
    //         reject(err)
    //     })
    //     .finally(() => {
    //         console.log('finally')
    //     })
    // })
}

const htmlPlugin = (options?: {
    appid?: string
    appKey?: string
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
                questions = getQuestions(code)
                console.log(questions)
                const { data } = await baiduTranslate(questions.join('&'))
                console.log(data)
            }
            return null
            
        },
        resolveId(source, importer, options) {
            console.log(source, importer, options)
            return null
        },
        async buildEnd() {
            console.log('buildEnd', questions)
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