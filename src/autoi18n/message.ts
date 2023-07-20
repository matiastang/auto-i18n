/*
 * @Author: matiastang
 * @Date: 2023-07-17 18:40:36
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-20 17:50:54
 * @FilePath: /auto-i18n/src/autoi18n/message.ts
 * @Description: messages
 */
const messages = {
    zh: {
        hello: '你好，世界',
        switch: '切换',
    },
    en: {
        hello: 'hello world',
        switch: 'switch',
    },
    ja: {
        hello: 'こんにちは、世界',
        switch: 'swit换',
    }
}

export default messages

let autoi18nMessages: {[key: string]: string} = {}

const translateMessages = (messages: {[key: string]: string}) => {
    autoi18nMessages = messages
}

export {
    autoi18nMessages,
    translateMessages,
}