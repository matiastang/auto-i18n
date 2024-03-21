import axios from 'axios'
import { translateHashKey } from '../autoi18n/utils'
import { Autoi18nMessages } from '../autoi18n/type'
import { TranslateTarget } from '../autoi18n/enum'

/**
 * 翻译返回内容格式
 */
interface ZhipuaiTranslateData {
    from: string
    to: string
    trans_result: {
        src: string
        dst: string
    }[]
}

/**
 * 翻译接口返回格式
 */
interface ZhipuaiTranslateRes {
    code: number,
    msg: string,
    data?: ZhipuaiTranslateData[],
    additional: {
        time: string,
        timestamp: number
    }
}

/**
 * 调用翻译
 * @param texts 
 * @param to 
 * @param from 
 * @returns 
 */
const zhipuaiTranslate = (texts: string[], tos: TranslateTarget[], from: TranslateTarget = TranslateTarget.ZH) => {
    const url = `http://127.0.0.1:8000/zhipu/translate/text`
    return new Promise<ZhipuaiTranslateData[]>((resolve, reject) => {
        axios.post<ZhipuaiTranslateRes>(url, {
            texts,
            tos,
            froms: from,
        },{
            headers: {
                'Content-Type': 'application/json'
            }
        }).then((res) => {
            console.log(res)
            const resData = res?.data
            const { code, msg, data } = resData
            if (code === 200) {
                console.log(`------ zhipuai translate ------`)
                resolve(data)
            } else {
                console.log(`------ zhipuai translate error_code=${code} error_msg=${msg} ------`)
                reject(resData)
            }
        }).catch((error) => {
            reject(error)
        })
    })
}

/**
 * 组合数据
 * @param data 
 * @param cache 
 * @returns 
 */
const zhipuaiTranslateMessage = (data: ZhipuaiTranslateData[], cache?: Autoi18nMessages) => {
    console.log(`------ zhipuai translate message ------`)
    console.log(data)
    const messages = data.reduce((msg, item) => {
        const { to, from, trans_result } = item
        for (let i = 0; i < trans_result.length; i++) {
            const { src, dst } = trans_result[i]
            if (typeof src !== 'string' || typeof dst !== 'string') {
                continue
            }
            const key = translateHashKey(src, true)
            const qMsg = msg[key]
            if (!qMsg) {
                msg[key] = {
                    [from]: src,
                    [to]: dst
                }
                continue
            }
            msg[key][to] = dst
        }
        return msg
    }, cache || {} as Autoi18nMessages)
    return messages
}

/**
 * 查找需要翻译的内容
 * @param cache 
 * @param questions 
 * @param tos
 * @returns 
 */
const checkTranslateQuestions = (cache: Autoi18nMessages, questions: string[], tos: TranslateTarget[]) => {
    return questions.filter((item) => {
        const key = translateHashKey(item, true)
        const info = cache[key]
        if (!info) {
            return true
        }
        return tos.findIndex((to) => !info[to]) != -1
    })
}

/**
 * 翻译，过滤掉已经在缓存中的内容
 * @param questions 
 * @param tos 
 * @param from 
 * @param cache 
 * @returns 
 */
const autoi18nTranslate = async (questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages): Promise<Autoi18nMessages | null> => {
    console.log('需要翻译：', questions)
    const nCacheQuestions = checkTranslateQuestions(cache, questions, tos)
    console.log('没有缓存，需要翻译：', nCacheQuestions)
    if (nCacheQuestions.length <= 0) {
        return null
    }
    const translateTos = tos.filter((item) => item !== from)
    if (translateTos.length <= 0) {
        return null
    }
    console.log('需要翻译为：', translateTos)
    try {
        const res = await zhipuaiTranslate(nCacheQuestions, translateTos, from)
        console.log('翻译结果：', res)
        if (!Array.isArray(res)) {
            return null
        }
        const messages = zhipuaiTranslateMessage(res)
        return messages
    } catch (error) {
        return null
    }
}

export default autoi18nTranslate