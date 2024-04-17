<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2024-04-17 18:11:17
 * @FilePath: /auto-i18n/src/views/home/i18Home.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <div class="title">
            <div class="item">{{ $translate(`你好，{name}`, {
                name: orgName
            }) }}</div>
            <div class="item">{{ $translate(`工作台`) }}</div>
            <div class="item">{{ $translate(`基金圈：{name}`, {
                name: orgName
            }) }}</div>
            <div class="item">{{ $translate('投研模板') }}</div>
            <div class="item">{{ $translate('况客推荐') }}</div>
            <div class="item">{{ $translate(`用户名：{name}`, {
                name: useName
            }) }}</div>
            <div class="item" @click="changeUser">{{ $translate('切换用户') }}</div>
        </div>
        <div class="send-page">
            <div class="item">
                <span class="lable">{{ $translate('问题：') }}</span>
                <input class="content" v-model="questionValue"/>
            </div>
            <div class="item">
                <span class="lable">{{ $translate('答案：') }}</span>
                <!-- <span class="content">{{ answerValue }}</span> -->
                <span class="content" v-html="answerHtml"></span>
                <!-- <textarea  class="content" v-model="answerValue" disabled></textarea> -->
            </div>
            <button class="item" @click="sendClick">{{ $translate('发送') }}</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { computed, ref, watchEffect } from 'vue'
import { autoTranslate } from '@autoi18n/autoi18n'
import { Autoi18nMessageValue } from '@autoi18n/type'
import { Marked } from 'marked'
import { markedHighlight } from "marked-highlight"
import hljs from 'highlight.js'
//引入markdown样式
import 'highlight.js/styles/github.css'

const marked=new Marked(
  markedHighlight({
    langPrefix: 'hljs language-',
    highlight(code, lang) {
        const language = hljs.getLanguage(lang) ? lang : 'shell'
        return hljs.highlight(code, { language }).value
    }
  })
)

const orgName = computed(() => {
    return autoTranslate('机构圈01')
})

const useName = ref('MT01')

const changeUser = () => {
    const id = Math.floor(Math.random() * 10)
    useName.value = `MT${id}`
}

const questionValue = ref('给出一元二次方程的通用解')
const answerValue = ref('')
const answerHtml = ref()

watchEffect(() => {
    answerHtml.value = marked.parse(answerValue.value)
})

const sendClick = () => {
    const question = questionValue.value
    console.log(question)
    if (!question.trim()) {
        console.warn('请输入问题')
        return
    }
    answerValue.value = ''
    const URL = 'http://127.0.0.1:8000/zhipu/stream/test'
    fetch(URL,{
        method: 'POST',
        headers: {
            Accept: "text/event-source",
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: question,
        })
    })
    .then(async (response) => {
        console.info(`流式响应-res：${Date.now()}`);
        if (!response.ok) {
            throw new Error("Network response was not ok");
        }

        const reader = response?.body?.getReader();

        if (!reader) {
            return;
        }

        // function read() {
        //   return reader.read().then(({ done, value }) => {
        //       if (done) {
        //           console.log('Stream complete');
        //           return;
        //       }
        //       // 在这里处理每个数据块
        //       console.log(value);
        //       // 继续读取下一个数据块
        //       read();
        //   });
        // }

        // // 开始读取数据流
        // read();

        const textDecoder = new TextDecoder();
        let result = true;
        while (result) {
            const { done, value } = await reader.read();
            if (done) {
                result = false;
                console.log('Done')
                break;
            }
            console.info(`流式响应-chunk：${Date.now()}`);
            const chunkText = textDecoder.decode(value);
            console.info(chunkText);
            try {
                const chunkObj = JSON.parse(chunkText.replace('data: ', ''))
                answerValue.value = answerValue.value + chunkObj.answer;
            } catch (error) {
                console.error(error)
            }
        }
    })
    .catch((error) => {
        console.warn(error);
    });
}

// const orgName = computed(() => {
//     return autoTranslate('机构圈01', {
//         locale: 'zh'
//     })
//
// }

// const info = reactive({
//     code: '60081'
// })

// onMounted(() => {
//     info.code = '60082'
// })

// import { Autoi18nMessages, Autoi18n } from '../../autoi18n/type'

// const autoi18n = inject<Autoi18n>('$autoi18n')

// const localeMessages: Autoi18nMessages = {
//     '你好': {
//         zh: '你好，世界',
//         en: 'hello world',
//         ja: 'こんにちは、世界',
//     }
// }

// const localeTranslate = (key: string) => {
//     const locale = autoi18n.locale
//     const values = localeMessages[key]
//     if (!values) {
//         return key
//     }
//     const value = values[locale]
//     if (!value) {
//         return key
//     }
//     return value
// }

</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100%;
    padding: 32px;
    background: white;

    .title {
        display: flex;
        align-items: center;

        .item {
            margin: 0px 16px;
        }
    }

    .send-page {
        .item {
            display: flex;
            align-items: center;
            margin: 12px 0px;

            .lable {
                flex-shrink: 0;
            }

            .content {
                width: 100%;
            }
        }

        .item:last-child {
            .content {
                height: 150px;
                background: #f2f2f2;
            }
        }
    }
}
</style>