// import jwt from 'jsonwebtoken'
import { translateHashKey, translateTargetText } from '../utils'
import { Autoi18nMessages } from '../type'
import { TranslateTarget } from '../enum'

/**
 * 翻译返回内容格式
 */
interface TranslateResult {
    from: string
    to: string
    trans_result: {
        src: string
        dst: string
    }[]
}

// 地址
const zhipuai_url = 'https://open.bigmodel.cn/api/paas/v4/chat/completions'

// 提示
const messages = [
    {
        "role": "system",
        "content": "你只需要做翻译，需要翻译使用<>符号包裹的的内容，翻译的结果也使用<>包裹，大括号包裹的内容，无需翻译，直接输出在对应的位置就行。"
    },
    {
        "role": "user",
        "content": "将：<你好，{name}>，翻译为英语。"
    },
    {
        "role": "assistant",
        "content": "<Hello, {name}>"
    },
    {
        "role": "user",
        "content": "将：<你好，{name}>、<科技>，翻译为英语。"
    },
    {
        "role": "assistant",
        "content": "<Hello, {name}>、<technology>"
    },
    {
        "role": "user",
        "content": "将：<科技>、<指数>、<经济>，翻译为英语。"
    },
    {
        "role": "assistant",
        "content": "<technology>、<index>、<economy>"
    },
    {
        "role": "user",
        "content": "将：<科技>、<指数>、<经济>，翻译为日语。"
    },
    {
        "role": "assistant",
        "content": "<テクノロジー>、<指数>、<経済>、<スルー>"
    },
]

/**
 * apikey格式校验
 * @param str 
 * @returns 
 */
const isValidApikey = (str: string): boolean => {  
    return /^[a-z0-9]+\.[a-z0-9]+$/.test(str)
}  

/**
 * 生成token
 * @param apikey 
 * @param exp_seconds 
 * @returns 
 */
const generate_token = (apikey: string, exp_seconds: number = 60 * 60): string | null => {
    debugger
    const valid = isValidApikey(apikey)
    if (!valid) {
        const err = 'apikey格式错误'
        console.warn(err)
        return null
    }
    try {
        const [id, secret] = apikey.split(".")
        const timestamp = Date.now()
        const payload = {
            "api_key": id,
            timestamp: timestamp,
            exp: timestamp + exp_seconds * 1000,
        };
        // 生成JWT
        // const token: string = jwt.sign(payload, secret, {
        //     algorithm: "HS256",
        //     expiresIn: '1h' // 令牌有效期为1小时
        // });
        return 'token'
    } catch (error) {
        console.warn(error)
        return null
    }
}

/**
 * 提取结果
 * @param input 
 * @returns 
 */
const extractContentBetweenTags = (input: string): string[] => {  
    const regex = /<([^>]*)>/g;  
    const matches = input.matchAll(regex);  
    const result: string[] = [];  
  
    for (const match of matches) {  
        result.push(match[1]);  
    }  
  
    return result;  
}  

/**
 * 智谱翻译
 * @param texts 
 * @param tos 
 * @param from 
 */
const translate = async (apiKey: string, texts: string[], tos: TranslateTarget[], from: TranslateTarget = TranslateTarget.ZH) => {
    const questions = texts.map(item => `<${item}>`).join('、')
    if (!questions) {
        const err = '没有待翻译内容'
        console.warn(err)
        return Promise.reject(err)
    }
    const tTos = tos.filter(item => item !== from)
    if (!tTos.length) {
        const err = '没有翻译目标'
        console.warn(err)
        return Promise.reject(err)
    }
    const token = generate_token(apiKey)
    if (!token) {
        const err = '生成token失败'
        console.warn(err)
        return Promise.reject(err)
    }
    const translatesRes:TranslateResult[] = []
    for (const to of tTos) {
        const target = translateTargetText(to)
        if (!target) {
            const err = '翻译目标没有对应描述'
            console.warn(err)
            continue
        }
        const body = {
            model: "glm-4",
            messages: [...messages, {
                role: "user",
                content: `将：${questions}，翻译为${target}。`
            }]
        };
        const headers = {
            'Content-Type': 'application/json',
            Authorization: token,
        }
        const res = await fetch(
            zhipuai_url,
            {
              method: "POST",
              body: JSON.stringify(body),
              headers,
            },
        ).then(res => res.json())
        console.log('=======ZHIPUAI 返回结果=======')
        console.log(res)
        // TODO: - 错误处理
        const content = res.choices[0].message.content
        console.log('=======返回文本=======')
        console.log(content)
        // 提取内容
        const resTexts = extractContentBetweenTags(content)
        console.log('=======目标和源内容=======')
        console.log(resTexts, texts)
        if (resTexts.length !== texts.length) {
            console.warn(`${resTexts} != ${texts}`)
            continue
        }
        // 组装结果   
        const transResult = texts.map((item, index) => {
            return {
                src: item,
                dst: resTexts[index]  
            }
        })
        const targetRes: TranslateResult = {
            from,
            to,
            "trans_result": transResult
        }
        console.log(`=======组装${from}->${to}结果=======`)
        console.log(targetRes)
        translatesRes.push(targetRes)
    }
    return translatesRes
}

/**
 * 组合数据
 * @param data 
 * @param cache 
 * @returns 
 */
const translateMessage = (data: TranslateResult[], cache?: Autoi18nMessages) => {
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
 * @param apiKey 
 * @param questions 
 * @param tos 
 * @param from 
 * @param cache 
 * @returns 
 */
const zhipuaiTranslate = async (apiKey: string, questions: string[], tos: TranslateTarget[], from: TranslateTarget, cache?: Autoi18nMessages): Promise<Autoi18nMessages | null> => {
    console.log('需要翻译：', questions)
    const nCacheQuestions = checkTranslateQuestions(cache, questions, tos)
    console.log('没有缓存，需要翻译：', nCacheQuestions)
    const translateTos = tos.filter((item) => item !== from)
    console.log('需要翻译为：', translateTos)
    try {
        const res = await translate(apiKey, nCacheQuestions, translateTos, from)
        console.log('翻译结果：', res)
        if (!Array.isArray(res)) {
            return null
        }
        const messages = translateMessage(res)
        return messages
    } catch (error) {
        return null
    }
}

export default zhipuaiTranslate