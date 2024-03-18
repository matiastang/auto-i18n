/*
 * @Author: matiastang
 * @Date: 2023-07-20 17:35:04
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-18 16:21:13
 * @FilePath: /auto-i18n/src/autoTranslate/baiduTranslate.ts
 * @Description: 百度翻译
 */
import CryptoJS from 'crypto-js'
import axios from 'axios'
import { translateHashKey } from '../autoi18n/utils'
import { LocaleType, Autoi18nMessages } from '../autoi18n/type'

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
    error_code?: string
    error_msg?: string
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
    return new Promise<BaiduTranslateRes>((resolve, reject) => {
        axios.post<BaiduTranslateRes>(url, data, {
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((res) => {
            const resData = res?.data
            const { error_code, error_msg } = resData
            if (!error_code) {
                console.log(`------ baidu translate ------`)
                console.log(data.q, resData)
                resolve(resData)
            } else {
                console.log(`------ baidu translate error_code=${error_code} error_msg=${error_msg} ------`)
                console.log(data)
                reject(resData)
            }
        }).catch((error) => {
            reject(error)
        })
    })
    // return new Promise<BaiduTranslateRes>((resolve, reject) => {
    //     setTimeout(() => {
    //         resolve({
    //             from: 'zh',
    //             to,
    //             trans_result: [
    //                 {
    //                     src: '工作台&基金圈：{name}&投研模板&况客推荐&切换&你好',
    //                     dst: 'Workbench&Fund Circle: {name}&Investment Research Template&Situation Customer Recommendation&Switching&Hello'
    //                 }
    //             ]
    //         })
    //     }, 500)
    // })
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
                const key = translateHashKey(question, true)
                const answer = answers[i]
                const qMsg = msg[key]
                if (!qMsg) {
                    msg[key] = {
                        [from]: question,
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
}

const checkTranslateQuestions = (cache: Autoi18nMessages, list: {
    key: string;
    value: string;
}[], to: LocaleType) => {
    return list.filter((item) => {
        const info = cache[item.key]
        if (!info) {
            return true
        }
        console.log(to, info[to])
        return info[to] === undefined
    }).map(item => item.value)
}

const autoi18nTranslate = async (questions: string[], tos: LocaleType[], from: LocaleType, cache?: Autoi18nMessages): Promise<Autoi18nMessages | null> => {
    console.log('需要翻译：', questions)
    const separator = '-'
    const hasQuestions = questions.map((value) => {
        return {
            key: translateHashKey(value, true),
            value,
        }
    })
    const promises: Promise<BaiduTranslateRes>[] = []
    console.log('tos=', tos)
    for (let i = 0; i < tos.length; i++) {
        const to = tos[i]
        if (cache) {
            const nQuestions = checkTranslateQuestions(cache, hasQuestions, to)
            console.log('过滤需要翻译：', nQuestions)
            if (nQuestions.length > 0) {
                promises.push(baiduTranslate(nQuestions.join(separator), to, from))
            }
        } else {
            promises.push(baiduTranslate(questions.join(separator), to, from))
        }
    }
    if (promises.length <= 0) {
        return null
    }
    try {
        const allPromise = Promise.all(promises)
        const res = await allPromise
        console.log(res)
        if (!Array.isArray(res)) {
            return null
        }
        const messages = baiduTranslateMessage(res, separator)
        return messages
    } catch (error) {
        return null
    }
}

export default autoi18nTranslate