<!--
 * @Author: matiastang
 * @Date: 2024-04-18 14:29:27
 * @LastEditors: matiastang
 * @LastEditTime: 2024-04-18 17:21:20
 * @FilePath: /auto-i18n/src/views/ai/components/MarkdownContent/index.vue
 * @Description: Markdown Content
-->
<template>
    <div class="markdown-content">
        <div class="markdown" v-html="contentHtml"></div>
    </div>
</template>
<script setup lang="ts">
import { computed } from 'vue'
import markdownit from 'markdown-it'
import { full as emoji } from 'markdown-it-emoji'
import hljs from 'highlight.js' // https://highlightjs.org

// 光标Href
const SuffixCursorHref = '/SuffixCursor'

const props = defineProps<{
    content: string
    isStreaming?: boolean
}>()

const md = markdownit({
  html: true,
  linkify: true,
  typographer: true,
  highlight: (str, lang) => {
    // 代码高亮
    if (lang && hljs.getLanguage(lang)) {
      try {
        return '<pre class="hljs"><code>' +
               hljs.highlight(lang, str, true).value +
               '</code></pre>';
      } catch (__) {}
    }

    return '<pre class="hljs"><code>' + md.utils.escapeHtml(str) + '</code></pre>';
  }
})
.use(emoji)

// 自定义链接
md.renderer.rules.link_open = (tokens, idx) => {
  const token = tokens[idx]
  const href = token.attrGet('href')
  const title = token.attrGet('title')
  const target = token.attrGet('target')
  const rel = token.attrGet('rel')
  const linkClass = token.attrGet('class')
  const linkStyle = token.attrGet('style')
  const linkId = token.attrGet('id')
  const linkTitle = token.attrGet('title')
  const linkText = token.content

  console.log(token)
  if (href === SuffixCursorHref) {
    return `<a class="custom-cursor">`
  }
  // 处理自定义链接
  const customLink = `<a href="${href}" title="${linkTitle}" target="${target}" rel="${rel}" class="${linkClass}" style="${linkStyle}" id="${linkId}">`
  return customLink
}

// md.renderer.rules.link_close = function (tokens, idx) {
//   return '</a>'
// }

/**
 * 生成HTML内容
 */
const contentHtml = computed(() => {
  const { content, isStreaming } = props
    // 响应中尾部添加光标
    const result = md.render(isStreaming ? content + `[](${SuffixCursorHref})` : content)
    // console.log('contentHtml', result)
    return result
})

</script>

<style lang="less" scoped>
.markdown-content {
    padding: 0px 16px;
    border-radius: 8px;
    border: 1px solid #f2f2f2;
    width: 100%;
    background: white;
    box-sizing: border-box;

    // .markdown {
    //     max-height: 300px;
    // }

    // 代码框样式
    ::v-deep .hljs {
        border-radius: 6px;
        padding: 12px;
        background: #f2f2f2;
    }

    ::v-deep .custom-cursor {
        display: inline-block;
        background: black;
        height: 14px;
        width: 2px;
        margin-bottom: 2px;
        vertical-align: middle;
        animation: cursor-blink 1s infinite;  
    }

    @keyframes cursor-blink {  
        0% {opacity: 1;}  
        50% {opacity: 0;}  
        100% {opacity: 1;}  
    }
}
</style>