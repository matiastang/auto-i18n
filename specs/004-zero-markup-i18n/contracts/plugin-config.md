# Contracts: 插件配置与注入代码契约（v0.2.0）

**Date**: 2026-09-06 | **Spec**: [spec.md](./spec.md)

本库对外契约有两层：**接入方编译期契约**（插件配置）与**构建产物运行时契约**（注入到接入方代码中的查表代码）。本文件定义 v0.2.0 的增量与不变量。

## C-1: 插件配置契约（`Autoi18nPluginConfig` 增量）

```ts
export interface Autoi18nPluginConfig {
    // …既有字段全部不变：isDev / locale / targets / aiModelConfig /
    //   readTranslateContent / saveTranslateContent / translate

    /**
     * 零标记扫描总开关（v0.2.0 新增）
     * 默认 true：自动发现 .vue 中含 CJK 的字符串文案并改写翻译
     * 设为 false 时插件行为等价 v0.1.0（仅显式 $translate/autoTranslate 管线）
     */
    autoScan?: boolean

    /**
     * 零标记扫描排除规则（v0.2.0 新增）
     * 字符串为模块 id/路径的包含匹配；RegExp 为 test 匹配
     * 命中任一规则的文件跳过零标记扫描（显式管线不受影响）
     */
    exclude?: (string | RegExp)[]
}
```

**约束**：
- 两字段均可选、默认行为开启——存量接入方零配置升级即获得新能力（FR-010）
- `exclude` 只影响零标记扫描，不影响显式提取/翻译/落盘（向后兼容边界）
- 配置对象含 `aiModelConfig.apiKey`，继续遵循"永不整体打印配置"的日志纪律（CLAUDE.md）

## C-2: 注入代码契约（构建产物内嵌，运行于接入方项目）

零标记路径注入到每个发生改写的 SFC 的代码块形态（**依赖面收紧为 `'vue'` 不再需要、`'auto-i18n-vue'` 必然可解析**——与既有注入依赖规则一致，禁止仓库内别名）：

```js
import { autoi18nInfo as _autoi18nInfo, translateHashKey } from 'auto-i18n-vue'

const _autoScanMessages = /* 本模块子集表：JSON.stringify 序列化，键 autoi18n_<md5> */
const _localeTranslate = (key, options) => {
    const item = _autoScanMessages[translateHashKey(key)]
    if (!item) return key
    const value = item[_autoi18nInfo.locale]
    if (!value) return key
    if (options) { /* {name} 占位符替换，函数式替换串（与既有行为一致） */ }
    return value
}
```

**约束**：
- `autoi18nInfo` 为既有公开导出（模块级 `reactive`）——**不使用 `inject()`**，因此普通 `<script>`（Options API）与 `<script setup>` 顶层均可用；响应式由渲染期间读取 `locale` 自动建立
- 注入代码与既有显式路径共用同一注入点与同一子集表序列化器（`devTransformMessages`）；一次注入同时服务两来源
- 运行时插件未安装时 `autoi18nInfo` 仍存在（默认 `zh`、空表）→ 回退原文，不抛错
- 子集表必须经 `JSON.stringify`（`devTransformMessages` 既有实现），禁止裸拼接

## C-3: 忽略注释契约

| 注释 | 生效段 | 语义 |
| --- | --- | --- |
| `/* autoi18n-ignore */` | `<script>` | 紧随其后的**一个语句**内的全部字符串字面量不提取、不改写 |
| `<!-- autoi18n-ignore -->` | `<template>` | 紧随其后的**一个元素**的文本与绑定表达式不提取、不改写 |

**约束**：
- 标记大小写敏感、前后允许空白；不提供作用域关闭语法（单点覆盖语义）
- 被忽略的字符串不产生词条（不进翻译管线），产物中保持字节原样
- 该契约属新增能力，v0.1.0 中这些注释无语义——无兼容负担

## C-4: 文案判定契约

- 判定正则：字符串内容含至少一个 CJK 统一表意字符（`\u3400-\u4dbf` `\u4e00-\u9fff`）、日文假名（`\u3040-\u30ff`）或谚文（`\uac00-\ud7af`）音节
- 纯 ASCII / 仅全角标点字符串一律不参与
- 跨字面量拼接表达式（`'共' + n + '条'`）不参与（首版边界，README 明示改用显式 API）
- 扫描范围仅 `.vue` 单文件组件；SFC 解析失败安全跳过

## C-5: 公开导出面

**新增导出：无。** 新增配置字段随 `Autoi18nPluginConfig` 类型面自然发布；扫描器内部模块（`scan/*`）不进入公开导出面。`index-exports` 既有测试固化的导出清单必须保持不变。
