import axios from 'axios'
import { translateHashKey } from '../autoi18n/utils'
import { LocaleType, Autoi18nMessages } from '../autoi18n/type'

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
const zhipuaiTranslate = (texts: string[], tos: LocaleType[], from: LocaleType = 'zh') => {
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
const checkTranslateQuestions = (cache: Autoi18nMessages, questions: string[], tos: LocaleType[]) => {
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
const autoi18nTranslate = async (questions: string[], tos: LocaleType[], from: LocaleType, cache?: Autoi18nMessages): Promise<Autoi18nMessages | null> => {
    console.log('需要翻译：', questions)
    const nCacheQuestions = checkTranslateQuestions(cache, questions, tos)
    console.log('没有缓存，需要翻译：', nCacheQuestions)
    const translateTos = tos.filter((item) => item !== from)
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
