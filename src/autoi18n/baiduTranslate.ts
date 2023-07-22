/*
 * @Author: matiastang
 * @Date: 2023-07-20 17:35:04
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-22 10:28:47
 * @FilePath: /auto-i18n/src/autoi18n/baiduTranslate.ts
 * @Description: 百度翻译
 */
import CryptoJS from 'crypto-js'
import axios from 'axios'
import { LocaleType, Autoi18nMessages, Autoi18nMessageItem } from './type'
// import { translateMessages } from './message'

interface BaiduTranslateParams {
    q: string
    from: string
    to: string
    appid: string
    salt: string | number
    sign: string
    action?: 0 | 1
}

interface BaiduTranslateRes {
    from: string
    to: string
    trans_result: {
        src: string
        dst: string
    }[]
    error_code?: number
}

const baiduTranslate = (q: string, to: LocaleType, from: LocaleType | 'auto' = 'auto') => {
    // src: "工作台&基金圈：机构圈01&投研模板&况客推荐"
    // dst: "Workbench&Fund Circle: Institutional Circle 01&Investment Research Template&Customer Recommendation"
    // const q = '工作台&基金圈：机构圈01&投研模板&况客推荐'
    const appid = ''
    const appkey = ''
    const salt = (new Date()).getTime()
    const sign: string = CryptoJS.MD5(appid + q + salt + appkey).toString()
    /*
    * 文档地址：https://fanyi-api.baidu.com/doc/21
    */
    const data: BaiduTranslateParams = {
        q,
        from,
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
    return new Promise<BaiduTranslateRes>((resolve, reject) => {
        setTimeout(() => {
            resolve({
                from: 'zh',
                to,
                trans_result: [
                  {
                    src: '工作台&基金圈：机构圈01&投研模板&况客推荐&切换&你好',
                    dst: 'Workbench&Fund Circle: Institutional Circle 01&Investment Research Template&Situation Customer Recommendation&Switching&Hello'
                  }
                ]
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

const baiduTranslateMessage = (data: BaiduTranslateRes[], separator: string = '&') => {
    const messages = data.reduce((msg, item) => {
        const { to, from, trans_result } = item
        for (let i = 0; i < trans_result.length; i++) {
            const { src, dst } = trans_result[i]
            if (typeof src !== 'string' || typeof dst !== 'string') {
                continue
            }
            const questions = src.split(separator)
            const answers = dst.split(separator)
            if (questions.length !== answers.length) {
                continue
            }
            for (let i = 0; i < questions.length; i++) {
                const question = questions[i]
                const key = `${question}`
                const answer = answers[i]
                const qMsg = msg[key]
                if (!qMsg) {
                    msg[key] = {
                        [from]: key,
                        [to]: answer
                    }
                    continue
                }
                msg[key][to] = answer
            }
        }
        return msg
    }, {} as Autoi18nMessages)
    return messages
    // return Object.entries<string>(messages).reduce((left, item) => {
    //     const [key, value] = item
    //     return {
    //         ...left,
    //         [`'${key}'`]: {
    //             'zh': key,
    //             'en': value
    //         }
    //     }
    // }, {} as Autoi18nMessages)
}

const autoi18nTranslate = async (questions: string[], tos: LocaleType[], from: LocaleType): Promise<Autoi18nMessages> => {
    console.log('需要翻译：', questions)
    const separator = '&'
    const promises: Promise<BaiduTranslateRes>[] = []
    for (let i = 0; i < tos.length; i++) {
        const to = tos[i]
        promises.push(baiduTranslate(questions.join(separator), to))
    }
    const allPromise = Promise.all(promises)
    const res = await allPromise
    const messages = baiduTranslateMessage(res, separator)
    return messages
}

export default autoi18nTranslate