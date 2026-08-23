/*
 * @Author: matiastang
 * @Date: 2024-08-15 15:40:17
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 15:42:14
 * @FilePath: /auto-i18n/src/autoi18n/@types/enum.ts
 * @Description: 枚举
 */
/**
 * 翻译目标
 */
export enum TranslateTarget {
    /**
     * 中文
     */
    ZH = 'zh',
    /**
     * 英语
     */
    EN = 'en',
    /**
     * 日语
     */
    JP = 'jp',
    /**
     * 阿拉伯语
     */
    ARA = 'ara',
    /**
     * 法语
     */
    FRA = 'fra'
}

/**
 * AI翻译模型
 */
export enum TranslateAIModel {
    /**
     * 智谱AI
     */
    ZHIPUAI = 'zhipuai',
    /**
     * OpenAI Chat Completions 兼容接口
     * （OpenAI、DeepSeek、Moonshot/Kimi、通义千问兼容模式、本地 Ollama 等）
     */
    OPENAI = 'openai'
}