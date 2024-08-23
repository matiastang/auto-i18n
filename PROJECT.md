<!--
 * @Author: matiastang
 * @Date: 2024-08-23 16:31:00
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-23 16:39:12
 * @FilePath: /auto-i18n/PROJECT.md
 * @Description: 开发文档
-->
# 开发文档

## 注意事项

### 使用的`Vue`版本

* 使用`"vue": "3.3.4"`如果使用`"vue": "3.4.38"`则`tsc --build src/autoi18n/tsconfig.json`会报如下错误：

```sh
> tsc --build src/autoi18n/tsconfig.json

node_modules/.pnpm/@vue+runtime-dom@3.4.38/node_modules/@vue/runtime-dom/dist/runtime-dom.d.ts:449:26 - error TS2304: Cannot find name 'ToggleEvent'.

449     onToggle?: (payload: ToggleEvent) => void;
```

* [vue修改一个issues时添加了`(payload: ToggleEvent) => void`](https://github.com/vuejs/core/pull/10938)
* `https://github.com/vuejs/core/blob/main/packages/runtime-dom/src/jsx.ts`的`409`行
```ts
export interface DetailsHTMLAttributes extends HTMLAttributes {
  open?: Booleanish
  onToggle?: (payload: ToggleEvent) => void
}
```
还不知道原因，只知道`3.3.4`版本没有问题，`3.4.38`版本有问题。
