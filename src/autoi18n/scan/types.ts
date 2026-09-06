/*
 * @FilePath: /auto-i18n/src/autoi18n/scan/types.ts
 * @Description: 零标记扫描的类型定义（data-model.md 实体）
 */

/**
 * 命中来源段
 */
export type ZeroMarkSource = 'template' | 'script'

/**
 * 零标记命中：单文件内发现的一个可翻译字符串字面量
 */
export interface ZeroMarkHit {
    /**
     * 字符串字面量内容值（不含引号）
     */
    text: string
    /**
     * 字面量（含引号）在模块源码中的起始偏移
     */
    start: number
    /**
     * 字面量（含引号）在模块源码中的结束偏移（不含）
     */
    end: number
    /**
     * 来源段
     */
    source: ZeroMarkSource
    /**
     * 是否被忽略注释覆盖（被覆盖者不提取、不改写）
     */
    ignored: boolean
}

/**
 * 显式调用点（$translate / autoTranslate 调用）覆盖的源码区间——零标记扫描跳落其间
 */
export interface ExplicitCallRange {
    start: number
    end: number
}

/**
 * 忽略标记覆盖区间
 */
export interface IgnoreRange {
    start: number
    end: number
}

/**
 * 单个 SFC 的扫描结果
 */
export interface ScanResult {
    /**
     * 零标记命中（含被忽略者，编排层过滤）
     */
    hits: ZeroMarkHit[]
    /**
     * 显式调用点区间（零标记改写必须跳过）
     */
    explicitRanges: ExplicitCallRange[]
}
