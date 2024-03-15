import CryptoJS from 'crypto-js'
import axios from 'axios'
import { translateHashKey } from './utils'
import { LocaleType, Autoi18nMessages } from './type'

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

const baiduTranslate = (texts: string[], to: LocaleType, from: LocaleType | 'auto' = 'auto') => {
    const url = `http://127.0.0.1:8000/zhipu/translate/text`
    return new Promise<BaiduTranslateRes>((resolve, reject) => {
        axios.post<BaiduTranslateRes>(url, {
            texts,
            tos: [to],
        },{
            headers: {
                'Content-Type': 'application/x-www-form-urlencoded'
            }
        }).then((res) => {
            const resData = res?.data
            const { error_code, error_msg } = resData
            if (!error_code) {
                console.log(`------ baidu translate ------`)
                // console.log(data.q, resData)
                resolve(resData)
            } else {
                console.log(`------ baidu translate error_code=${error_code} error_msg=${error_msg} ------`)
                // console.log(data)
                reject(resData)
            }
        }).catch((error) => {
            reject(error)
        })
    })
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
                promises.push(baiduTranslate(nQuestions, to, from))
            }
        } else {
            promises.push(baiduTranslate(questions, to, from))
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

// {
//     "autoi18n1bb3393452b2ff9675f77b3fafd4d2c3":{
//         "zh":"工作台",
//         "en":"Workbench",
//         "jp":"ワークベンチ",
//         "ara":"منصة العمل ",
//         "fra":"Workbench "
//     },
//     "autoi18nfa87e06f026cb6b795f0425395d6dd88":{
//         "zh":"投研模板",
//         "en":"Investment Research Template",
//         "jp":"投研テンプレート",
//         "ara":" الاستثمار في البحوث قالب ",
//         "fra":" modèle de recherche de placement "
//     },
//     "autoi18nbb7606e7850b2989902be273176254ca":{
//         "zh":"况客推荐",
//         "en":"Customer Recommendation",
//         "jp":"ケース推奨",
//         "ara":" التوصية ",
//         "fra":" recommandation du client "
//     },
//     "autoi18nbec7e4d621a66bff059edb31816fbf52":{
//         "zh":"切换",
//         "en":"Switch",
//         "jp":"切り替え"
//     },
//     "autoi18n16a97d01b758e3984e5d5a86f89b9f80":{
//         "zh":"改变",
//         "en":"Change",
//         "jp":"変更"
//     },
//     "autoi18na4820d24b3060878e230f859492790df":{
//         "zh":"基金圈：{name}",
//         "en":"Fund Circle: {name}",
//         "jp":"基金圏：{name}",
//         "ara":" مؤسسة دائرة : { اسم } ",
//         "fra":" cercle de fonds: {nom} "
//     },
//     "autoi18n06d1f3397d300fe91954514cca07c25b":{
//         "zh":"机构圈01",
//         "en":"Institutional Circle 01",
//         "jp":"機関圏01",
//         "ara":" مؤسسة دائرة 01",
//         "fra":" cercle institutionnel 01"
//     },
//     "autoi18na7bac2239fcdcb3a067903d8077c4a07":{
//         "zh":"中文",
//         "en":"Chinese",
//         "jp":"中国語",
//         "ara":" الصينية ",
//         "fra":" chinois "
//     },
//     "autoi18ncef67a3be8694b633adddeb04659a43c":{
//         "zh":"日文",
//         "en":"Japanese",
//         "jp":"日本語",
//         "ara":" اليابانية ",
//         "fra":" japonais "
//     },
//     "autoi18nf9fb6a063d1856da86a06def2dc6b921":{
//         "zh":"英文",
//         "en":"English",
//         "jp":"英語",
//         "ara":" الإنجليزية",
//         "fra":" anglais"
//     },
//     "autoi18n87eae32c73de58efaa437e642e4d270e":{
//         "zh":"自动国际化",
//         "en":"Automatic internationalization",
//         "jp":"自動国際化",
//         "ara":"التدويل التلقائي ",
//         "fra":"Internationalisation automatique "
//     },
//     "autoi18n358a3ba157ef7062be4bcd5e3ae3ebb1":{
//         "zh":"语言切换",
//         "en":"language switching",
//         "jp":"言語切り替え",
//         "ara":" تبديل اللغة ",
//         "fra":" changement de langue "
//     },
//     "autoi18n89be8321559a212a26abff7f7f3f28b7":{
//         "zh":"当前语言：{name}",
//         "en":"current language: {name}",
//         "jp":"現在の言語:{name}",
//         "ara":" اللغة الحالية : { اسم } ",
//         "fra":" langue actuelle: {nom} "
//     },
//     "autoi18nb1428cac39baa4712ccf858a7fd09776":{
//         "zh":"阿拉伯语",
//         "en":"Arabic",
//         "jp":"アラビア語",
//         "ara":"بالعربية",
//         "fra":" arabe "
//     },
//     "autoi18n8607ec08342e49e9ba1ed862b6c33dc9":{
//         "zh":"法语",
//         "en":"French",
//         "jp":"フランス語",
//         "ara":"الفرنسية .",
//         "fra":" français "
//     }
// }
