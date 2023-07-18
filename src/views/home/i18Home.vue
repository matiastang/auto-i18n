<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-17 16:02:45
 * @FilePath: /auto-i18n/src/views/home/i18Home.vue
 * @Description: i18Home
-->
<template>
    <div class="page">
        <div class="title">
            <div class="item">{{ $translate('工作台') }}</div>
            <div class="item">{{ $translate('基金圈：机构圈01') }}</div>
            <div class="item">{{ $translate('投研模板') }}</div>
            <div class="item">{{ $translate('况客推荐') }}</div>
        </div>
        <div @click="changeClick">{{ $translate('切换') }}</div>
        <div>{{ $translate('你好') }}</div>

        <div @click="switchLanguage">vue-i18n切换</div>
        <div>{{ $t('hello') }}</div>
    </div>
</template>
<script setup lang="ts">
import { getCurrentInstance, inject, onMounted } from 'vue'
import CryptoJS from 'crypto-js'

interface BaiduTranslateParams {
    q: string
    from: string
    to: string
    appid: string
    salt: string
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

const appProxy = getCurrentInstance().proxy

const autoi18n = inject<any>('$autoi18n')

const changeClick = () => {
    const nowLocale = appProxy.$autoi18n.locale
    console.log(nowLocale, autoi18n.locale)
    if (nowLocale === 'zh') {
        appProxy.$autoi18n.locale = 'en'
    } else if (nowLocale === 'en') {
        appProxy.$autoi18n.locale = 'ja'
    } else {
        appProxy.$autoi18n.locale = 'zh'
    }
}

const switchLanguage = () => {
    const nowLocale = appProxy.$i18n.locale
    if (nowLocale === 'zh') {
        appProxy.$i18n.locale = 'en'
    } else if (nowLocale === 'en') {
        appProxy.$i18n.locale = 'ja'
    } else {
        appProxy.$i18n.locale = 'zh'
    }
}

const getBaiduTranslateSign = (signStr: string): string => {
    const str = signStr + ''
    const md5Hash = CryptoJS.MD5(str)
    return md5Hash.toString()
}

const baiduTranslate = () => {
    // console.log(import.meta.env.BAIDU_APP_ID, import.meta.env.BAIDU_APP_KEY)
    // const q = '确定，参数'
    const q = '工作台&基金圈：机构圈01&投研模板&况客推荐'
    // src: "工作台&基金圈：机构圈01&投研模板&况客推荐"
    // dst: "Workbench&Fund Circle: Institutional Circle 01&Investment Research Template&Customer Recommendation"
    const to = 'en'
    const appid = ''
    const salt = (new Date()).getTime()
    const sign = getBaiduTranslateSign(appid + q + salt)
    // console.log(sign, sign.length)
    // const url = `https://fanyi-api.baidu.com/api/trans/vip/translate?q=${q}&from=auto&to=${to}&appid=${appid}&salt=${salt}&sign=${sign}`
    // fetch(url, {
    //     method: 'get'
    // })
    // .then((res) => {
    //     console.log(res)
    // })
    // .catch((err) => {
    //     console.log(err)
    // })
    // .finally(() => {
    //     console.log('finally')
    // })
    /*
    * 文档地址：https://fanyi-api.baidu.com/doc/21
    */
    const params = {
        q,
        from: 'auto',
        to,
        appid,
        salt: '' + salt,
        sign,
    }
    const url = `https://fanyi-api.baidu.com/api/trans/vip/translate`
    fetch(url, {
        method: 'POST',
        headers: {
            'Content-Type': 'application/x-www-form-urlencoded'
        },
        body: new URLSearchParams(params),
    })
    // .then(response => response.json()) // 如果响应是JSON格式，则解析响应数据
    .then((res) => {
        console.log(res)
    })
    .catch((err) => {
        console.log(err)
    })
    .finally(() => {
        console.log('finally')
    })
}

onMounted(() => {
    // baiduTranslate()
})

</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100vw;
    height: 100vh;
    padding: 32px;
    background: white;

    .title {
        display: flex;
        align-items: center;

        .item {
            margin: 0px 16px;
        }
    }
}
</style>