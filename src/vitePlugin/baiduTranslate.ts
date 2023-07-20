/*
 * @Author: matiastang
 * @Date: 2023-07-20 17:35:04
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-20 17:51:02
 * @FilePath: /auto-i18n/src/vitePlugin/baiduTranslate.ts
 * @Description: 百度翻译
 */
import CryptoJS from 'crypto-js'
import axios from 'axios'
import { translateMessages } from '../autoi18n/message'

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

const translateMessage = (trans_result: { src: string, dst: string }[], separator: string = '&') => {
    return trans_result.reduce((left, item) => {
        const { src, dst } = item
        if (typeof src !== 'string' || typeof dst !== 'string') {
            return left
        }
        const questions = src.split(separator)
        const answers = dst.split(separator)
        if (questions.length !== answers.length) {
            return left
        }
        const obj = {}
        for (let i = 0; i < questions.length; i++) {
            const question = questions[i]
            const answer = answers[i]
            obj[question] = answer
        }
        return {
            ...left,
            ...obj
        }
    }, {})
}

const translate = async (questions: string[]) => {
    const { data } = await baiduTranslate(questions.join('&'))
    const messages = translateMessage(data.trans_result)
    console.log(messages)
    translateMessages(messages as any)
}

export default translate