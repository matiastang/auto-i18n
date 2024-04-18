<template>
    <div class="page">
        <div class="send-page">
            <div class="item">
                <span class="lable">{{ $translate('问题：') }}</span>
                <input class="content" v-model="questionValue"/>
            </div>
            <div class="item">
                <span class="lable">{{ $translate('答案：') }}</span>
                <MarkdownContent :content="answerValue" :isStreaming="isStreaming"></MarkdownContent>
            </div>
            <button class="item" @click="sendClick">{{ $translate('发送') }}</button>
            <button class="item" @click="cancelClick">{{ $translate('取消') }}</button>
        </div>
    </div>
</template>
<script setup lang="ts">
import { ref } from 'vue'
import MarkdownContent from './components/MarkdownContent/index.vue'

const questionValue = ref('写一个函数，判断一个数是不是质数')
const answerValue = ref('👍🏻')
const isStreaming = ref(true)

const abortController = ref<AbortController | null>(null)

const chunkParse = (text: string) => {
    // 使用matchAll搜索
    const dataList = []
    for (const match of text.matchAll(/data: (\{"answer": ".+"\})\n\n/gi)) {
        // console.log(match);
        let matchStr = match[0]
        if (match.length > 1) {
            matchStr = match[1]
        } else {
            matchStr = matchStr.replace(/data: /g, '').replace(/\}\s+/g, '}')
        }
        try {
            const data = JSON.parse(matchStr)
            dataList.push(data)
        } catch (error) {
            console.error(error)
        }
    }
    // console.log(dataList)
    return dataList.reduce((left, right) => {
        const lAnswer = left.answer
        const rAnswer = right.answer
        if (!rAnswer) {
            return left
        }
        if (lAnswer) {
            left.answer = lAnswer + rAnswer
        } else {
            left.answer = rAnswer
        }
        return left
    }, {
        answer: '',
    })
}

const sendClick = () => {
    const question = questionValue.value
    console.log(question)
    if (!question.trim()) {
        console.warn('请输入问题')
        return
    }
    answerValue.value = ''
    const abort = new AbortController()
    abortController.value = abort
    const signal = abort.signal
    const URL = 'http://127.0.0.1:8000/zhipu/stream/test'
    fetch(URL,{
        method: 'POST',
        headers: {
            Accept: "text/event-source",
            'Content-Type': 'application/json',
        },
        body: JSON.stringify({
            prompt: question,
        }),
        signal: signal,
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
        isStreaming.value = true;
        while (result) {
            const { done, value } = await reader.read();
            if (done) {
                result = false;
                isStreaming.value = false;
                console.log('Done')
                break;
            }
            console.info(`流式响应-chunk：${Date.now()}`);
            const chunkText = textDecoder.decode(value);
            console.info(chunkText);
            try {
                // const chunkObj = JSON.parse(chunkText.replace('data: ', ''))
                const chunkObj = chunkParse(chunkText)
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

const cancelClick = () => {
    const abort = abortController.value
    if (abort) {
        abort.abort()
        isStreaming.value = false;
        abortController.value = null
    }
}
</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    padding: 32px;

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