<!--
 * @Author: matiastang
 * @Date: 2023-07-13 17:42:47
 * @LastEditors: matiastang
 * @LastEditTime: 2026-08-25 10:00:00
 * @FilePath: /auto-i18n/src/views/autoi18nHome.vue
 * @Description: autoi18n 能力演示页——覆盖中文即 Key、构建期提取、插值、脚本侧翻译、哈希存储、回退机制、RTL 等特性
-->
<template>
    <div class="page">
        <!-- 概览 -->
        <section class="card hero">
            <h1 class="hero-title">{{ $translate(`auto-i18n-vue 能力演示`) }}</h1>
            <p class="hero-desc">{{ $translate(`业务代码直接书写中文，框架自动完成提取、翻译与运行时切换`) }}</p>
            <div class="hero-meta">
                <span class="badge">{{ localeBadgeText }}</span>
                <span class="badge">{{ messageCountBadgeText }}</span>
                <span class="badge">{{ pageDirBadgeText }}</span>
            </div>
        </section>

        <!-- 特性卡片 -->
        <section class="features">
            <div class="card feature" v-for="item in featureList" :key="item.title">
                <div class="feature-title">{{ item.title }}</div>
                <div class="feature-desc">{{ item.desc }}</div>
            </div>
        </section>

        <!-- 基础翻译与插值 -->
        <section class="card block">
            <h2 class="block-title">{{ $translate(`基础翻译与插值`) }}</h2>
            <div class="row">
                <span class="row-label">{{ $translate(`静态文案`) }}</span>
                <span class="row-value">{{ $translate(`个人介绍`) }}</span>
            </div>
            <div class="row">
                <span class="row-label">{{ $translate(`脚本取值`) }}</span>
                <span class="row-value">{{ $translate(`公司名称：{name}`, { name: companyName }) }}</span>
            </div>
            <div class="row">
                <span class="row-value">{{ $translate(`用户名：{name}`, { name: userName }) }}</span>
                <button class="btn" @click="changeUser">{{ $translate(`切换用户`) }}</button>
            </div>
            <div class="row">
                <span class="row-value">{{ $translate(`您有 {count} 条未读消息`, { count: unread }) }}</span>
                <button class="btn" @click="mockRefresh">{{ $translate(`模拟刷新`) }}</button>
            </div>
            <div class="row">
                <span class="row-value">{{ $translate(`当前时间：{time}`, { time: clockText }) }}</span>
            </div>
        </section>

        <!-- 脚本侧翻译 -->
        <section class="card block">
            <h2 class="block-title">{{ $translate(`脚本侧翻译`) }}</h2>
            <p class="block-hint">{{ $translate(`下拉选项由脚本中的翻译函数生成，切换语言即时更新`) }}</p>
            <div class="row">
                <span class="row-label">{{ $translate(`报表类型`) }}</span>
                <select class="select" v-model="reportIndex">
                    <option v-for="(item, idx) in reportOptions" :key="idx" :value="idx">{{ item }}</option>
                </select>
            </div>
            <div class="row">
                <span class="row-value">{{ $translate(`已选择：{name}`, { name: reportSelectedLabel }) }}</span>
            </div>
        </section>

        <!-- 回退机制与哈希 -->
        <section class="card block">
            <h2 class="block-title">{{ $translate(`回退机制与哈希`) }}</h2>
            <p class="block-hint">{{ $translate(`修改下方文案，未收录的文本会回退显示原文`) }}</p>
            <input class="input" type="text" v-model="fallbackText" />
            <div class="hash-line">
                <span class="hash-key">{{ fallbackHash }}</span>
            </div>
            <div class="row">
                <span class="row-value strong">{{ fallbackTranslated }}</span>
                <span v-if="fallbackHit" class="tag ok">{{ $translate(`已收录`) }}</span>
                <span v-else class="tag warn">{{ $translate(`未收录，回退原文`) }}</span>
            </div>
        </section>

        <!-- 翻译仓库检查器 -->
        <section class="card block">
            <h2 class="block-title">{{ $translate(`翻译仓库检查器`) }}</h2>
            <div class="row">
                <input class="input grow" type="text" v-model="searchText" :placeholder="$translate(`搜索中文或译文`)"/>
                <span class="row-label">{{ $translate(`共 {count} 条`, { count: filteredMessages.length }) }}</span>
            </div>
            <div class="table">
                <div class="tr head">
                    <span class="td">{{ $translate(`哈希 Key`) }}</span>
                    <span class="td">{{ $translate(`中文原文`) }}</span>
                    <span class="td">{{ $translate(`当前语言译文`) }}</span>
                </div>
                <div class="tr" v-for="row in messageRows" :key="row.key">
                    <span class="td mono">{{ row.key }}</span>
                    <span class="td">{{ row.zh }}</span>
                    <span class="td">{{ row.current }}</span>
                </div>
                <div class="table-empty" v-if="filteredMessages.length <= 0">{{ $translate(`暂无匹配词条`) }}</div>
            </div>
            <p class="block-hint" v-if="filteredMessages.length > messageRows.length">{{ $translate(`仅展示前 {count} 条`, { count: messageRows.length }) }}</p>
        </section>

        <!-- 真实场景：登录表单 -->
        <section class="card block">
            <h2 class="block-title">{{ $translate(`真实场景：登录表单`) }}</h2>
            <p class="block-hint">{{ $translate(`表单标签、占位与校验提示全部参与翻译`) }}</p>
            <div class="form">
                <div class="field">
                    <label class="row-label">{{ $translate(`用户名`) }}</label>
                    <input class="input" type="text" v-model="loginUser" :placeholder="$translate(`请输入用户名`)"/>
                    <div class="field-error" v-if="loginErrorUser">{{ loginErrorUser }}</div>
                </div>
                <div class="field">
                    <label class="row-label">{{ $translate(`密码`) }}</label>
                    <input class="input" type="password" v-model="loginPwd" :placeholder="$translate(`请输入密码`)"/>
                    <div class="field-error" v-if="loginErrorPwd">{{ loginErrorPwd }}</div>
                </div>
                <button class="btn primary" @click="loginSubmit">{{ $translate(`登录`) }}</button>
                <p class="form-success" v-if="loginSuccess">{{ loginSuccess }}</p>
            </div>
        </section>

        <footer class="footer">
            <span>{{ $translate(`以上页面文案均由 auto-i18n-vue 在开发阶段自动翻译`) }}</span>
            <a class="link" href="/__inspect/" target="_blank" rel="noreferrer">{{ $translate(`查看插件转换结果`) }}</a>
        </footer>
    </div>
</template>
<script setup lang="ts">
import { computed, inject, onMounted, onUnmounted, ref } from 'vue'

import { autoTranslate, TranslateTarget } from 'auto-i18n-vue'
import { Autoi18nInfo } from 'auto-i18n-vue/dist/@types'
import { demoHashKey } from './i18nHash'
import { formatTranslate } from './i18nFormat'

const autoi18n = inject<Autoi18nInfo>('$autoi18n')

/**
 * ====== 概览 ======
 */
const messageCount = computed(() => {
    return Object.keys(autoi18n?.messages ?? {}).length
})
const pageDirText = computed(() => {
    return autoi18n?.locale === 'ara' ? 'RTL' : 'LTR'
})
const localeBadgeText = computed(() => formatTranslate(`当前语言：{code}`, { code: autoi18n?.locale ?? '' }))
const messageCountBadgeText = computed(() => formatTranslate(`词条总数：{count}`, { count: messageCount.value }))
const pageDirBadgeText = computed(() => formatTranslate(`页面方向：{dir}`, { dir: pageDirText.value }))

/**
 * ====== 特性卡片 ======
 */
const featureList = computed(() => {
    return [
        {
            title: autoTranslate(`中文即 Key`),
            desc: autoTranslate(`业务代码直接书写中文，无需维护翻译键名`),
        },
        {
            title: autoTranslate(`构建期自动提取`),
            desc: autoTranslate(`开发与构建时由 Vite 插件扫描代码并自动翻译`),
        },
        {
            title: autoTranslate(`免配置翻译源`),
            desc: autoTranslate(`默认使用免费三方翻译，也可接入大模型翻译源`),
        },
        {
            title: autoTranslate(`运行时即时切换`),
            desc: autoTranslate(`切换语言响应式生效，无需刷新页面`),
        },
        {
            title: autoTranslate(`占位符插值`),
            desc: autoTranslate(`支持 {name} 形式占位符，翻译时自动保护不被破坏`),
        },
        {
            title: autoTranslate(`哈希词条存储`),
            desc: autoTranslate(`中文文案经 MD5 哈希作为键，统一存于翻译文件`),
        },
        {
            title: autoTranslate(`未收录回退原文`),
            desc: autoTranslate(`词条缺失时回退显示原文，页面不白屏`),
        },
        {
            title: autoTranslate(`阿拉伯语 RTL`),
            desc: autoTranslate(`切换阿拉伯语时页面自动切换为右到左布局`),
        },
    ]
})

/**
 * ====== 基础翻译与插值 ======
 */
const companyName = computed(() => {
    return autoTranslate(`西筹科技`)
})
const userName = ref('user001')
const changeUser = () => {
    userName.value = `user${Math.floor(Math.random() * 100)}`
}
const unread = ref(3)
const mockRefresh = () => {
    unread.value = Math.floor(Math.random() * 99) + 1
}
const clockText = ref('')
let clockTimer = 0
const updateClock = () => {
    const d = new Date()
    clockText.value = [d.getHours(), d.getMinutes(), d.getSeconds()]
        .map((n) => String(n).padStart(2, '0'))
        .join(':')
}
onMounted(() => {
    updateClock()
    clockTimer = window.setInterval(updateClock, 1000)
})
onUnmounted(() => {
    window.clearInterval(clockTimer)
})

/**
 * ====== 脚本侧翻译 ======
 */
const reportIndex = ref(0)
const reportOptions = computed(() => {
    return [
        autoTranslate(`日报`),
        autoTranslate(`周报`),
        autoTranslate(`月报`),
        autoTranslate(`年报`),
    ]
})
const reportSelectedLabel = computed(() => {
    return reportOptions.value[reportIndex.value] ?? ''
})

/**
 * ====== 回退机制与哈希 ======
 */
const fallbackText = ref(`这句话还没有被收录进翻译仓库`)
const fallbackHash = computed(() => {
    return demoHashKey(fallbackText.value)
})
const fallbackTranslated = computed(() => {
    return autoTranslate(fallbackText.value)
})
const fallbackHit = computed(() => {
    const locale = autoi18n?.locale
    const item = autoi18n?.messages?.[fallbackHash.value]
    return Boolean(locale && item && item[locale])
})

/**
 * ====== 翻译仓库检查器 ======
 */
const searchText = ref('')
const filteredMessages = computed(() => {
    const query = searchText.value.trim().toLowerCase()
    const locale = autoi18n?.locale ?? TranslateTarget.ZH
    const messages = autoi18n?.messages ?? {}
    return Object.entries(messages)
        .filter((entry) => {
            const [key, item] = entry
            if (!query) {
                return true
            }
            if (key.toLowerCase().includes(query)) {
                return true
            }
            if (String(item.zh ?? '').includes(query)) {
                return true
            }
            return String(item[locale] ?? '')
                .toLowerCase()
                .includes(query)
        })
        .map((entry) => {
            const [key, item] = entry
            return {
                key,
                zh: String(item.zh ?? '—'),
                current: String(item[locale] ?? '—'),
            }
        })
})
const messageRows = computed(() => {
    return filteredMessages.value.slice(0, 50)
})

/**
 * ====== 真实场景：登录表单 ======
 */
const loginUser = ref('')
const loginPwd = ref('')
const loginSubmitted = ref(false)
const loginErrorUser = computed(() => {
    if (!loginSubmitted.value || loginUser.value.trim()) {
        return ''
    }
    return autoTranslate(`请输入用户名`)
})
const loginErrorPwd = computed(() => {
    if (!loginSubmitted.value || loginPwd.value) {
        return ''
    }
    return autoTranslate(`请输入密码`)
})
const loginSuccess = computed(() => {
    if (!loginSubmitted.value || !loginUser.value.trim() || !loginPwd.value) {
        return ''
    }
    return autoTranslate(`登录成功，欢迎回来，{name}`, { name: loginUser.value.trim() })
})
const loginSubmit = () => {
    loginSubmitted.value = true
}
</script>

<style lang="less" scoped>
.page {
    box-sizing: border-box;
    width: 100%;
    max-width: 1120px;
    margin: 0 auto;
    padding: 24px 24px 40px;
    display: flex;
    flex-direction: column;
    gap: 20px;

    .card {
        box-sizing: border-box;
        background: white;
        border-radius: 12px;
        padding: 20px 24px;
        box-shadow: 0 1px 4px rgba(48, 49, 51, 0.08);
    }

    .hero {
        padding: 32px 24px;

        .hero-title {
            margin: 0;
            font-size: 26px;
            font-weight: 700;
            color: #303133;
        }

        .hero-desc {
            margin: 10px 0 0;
            font-size: 15px;
            color: #606266;
        }

        .hero-meta {
            display: flex;
            flex-wrap: wrap;
            gap: 10px;
            margin-top: 16px;

            .badge {
                padding: 4px 12px;
                border-radius: 999px;
                background: rgba(102, 103, 171, 0.1);
                color: #6667ab;
                font-size: 13px;
            }
        }
    }

    .features {
        display: grid;
        grid-template-columns: repeat(auto-fill, minmax(240px, 1fr));
        gap: 14px;

        .feature {
            .feature-title {
                font-size: 15px;
                font-weight: 600;
                color: #303133;
            }

            .feature-desc {
                margin-top: 8px;
                font-size: 13px;
                line-height: 1.6;
                color: #909399;
            }
        }
    }

    .block {
        .block-title {
            margin: 0;
            font-size: 18px;
            font-weight: 600;
            color: #303133;
        }

        .block-hint {
            margin: 8px 0 0;
            font-size: 13px;
            color: #909399;
        }

        .row {
            display: flex;
            align-items: center;
            gap: 12px;
            margin-top: 14px;

            .row-label {
                flex-shrink: 0;
                font-size: 13px;
                color: #909399;
            }

            .row-value {
                font-size: 15px;
                color: #303133;

                &.strong {
                    font-size: 17px;
                    font-weight: 600;
                }
            }

            .grow {
                flex-grow: 1;
            }
        }

        .btn {
            padding: 6px 16px;
            border-radius: 8px;
            border: 1px solid rgba(102, 103, 171, 0.45);
            background: white;
            color: #6667ab;
            font-size: 14px;
            cursor: pointer;
            transition: all 0.2s;

            &:hover {
                background: rgba(102, 103, 171, 0.08);
            }

            &.primary {
                background: #6667ab;
                border-color: #6667ab;
                color: white;

                &:hover {
                    background: #5658a1;
                }
            }
        }

        .select {
            box-sizing: border-box;
            min-width: 200px;
            padding: 6px 10px;
            border-radius: 8px;
            border: 1px solid #dcdfe6;
            background: white;
            font-size: 14px;
            color: #303133;
            outline: none;

            &:focus {
                border-color: #6667ab;
            }
        }

        .input {
            box-sizing: border-box;
            width: 100%;
            padding: 8px 12px;
            border-radius: 8px;
            border: 1px solid #dcdfe6;
            font-size: 14px;
            color: #303133;
            outline: none;
            transition: border-color 0.2s;

            &:focus {
                border-color: #6667ab;
            }
        }

        .hash-line {
            margin-top: 10px;

            .hash-key {
                font-family: Consolas, Monaco, monospace;
                font-size: 12px;
                color: #909399;
                word-break: break-all;
            }
        }

        .tag {
            flex-shrink: 0;
            padding: 2px 10px;
            border-radius: 999px;
            font-size: 12px;

            &.ok {
                background: rgba(103, 194, 58, 0.12);
                color: #67c23a;
            }

            &.warn {
                background: rgba(230, 162, 60, 0.12);
                color: #e6a23c;
            }
        }

        .table {
            margin-top: 14px;
            border: 1px solid #ebeef5;
            border-radius: 8px;
            overflow: hidden;

            .tr {
                display: grid;
                grid-template-columns: 1.2fr 1fr 1fr;
                gap: 8px;
                padding: 8px 12px;
                border-bottom: 1px solid #ebeef5;
                font-size: 13px;
                color: #606266;

                &:last-child {
                    border-bottom: none;
                }

                &.head {
                    background: #fafafa;
                    font-weight: 600;
                    color: #303133;
                }

                .td {
                    overflow: hidden;
                    text-overflow: ellipsis;
                    white-space: nowrap;

                    &.mono {
                        font-family: Consolas, Monaco, monospace;
                        font-size: 12px;
                        color: #909399;
                    }
                }
            }

            .table-empty {
                padding: 24px 0;
                text-align: center;
                font-size: 13px;
                color: #c0c4cc;
            }
        }

        .form {
            margin-top: 14px;
            display: flex;
            flex-direction: column;
            gap: 14px;
            max-width: 420px;

            .field {
                display: flex;
                flex-direction: column;
                gap: 6px;

                .field-error {
                    font-size: 12px;
                    color: #f56c6c;
                }
            }

            .form-success {
                margin: 0;
                font-size: 14px;
                color: #67c23a;
            }
        }
    }

    .footer {
        display: flex;
        flex-wrap: wrap;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        font-size: 13px;
        color: #909399;

        .link {
            color: #6667ab;
            text-decoration: none;

            &:hover {
                text-decoration: underline;
            }
        }
    }
}
</style>
