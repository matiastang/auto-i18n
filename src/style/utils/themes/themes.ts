/*
 * @Author: matiastang
 * @Date: 2022-05-11 10:15:46
 * @LastEditors: matiastang
 * @LastEditTime: 2022-05-11 10:28:39
 * @FilePath: /datumwealth-front-scaffold/src/common/utils/themes/themes.ts
 * @Description: 切换主题
 */
import cssVars from 'css-vars-ponyfill'

const createLink = (() => {
    let $link: HTMLLinkElement | null = null
    return () => {
        if ($link) {
            return $link
        }
        $link = document.createElement('link')
        $link.rel = 'stylesheet'
        $link.type = 'text/css'
        document.querySelector('head')?.appendChild($link)
        return $link
    }
})()

/**
 * 主题切换函数
 * @param {string} theme - 主题名称, 默认default
 * @return {string} 主题名称
 */
const toggleTheme = (
    theme: string = 'default',
    prefix: string = './src/common/themes/',
    suffix: string = '.css'
) => {
    console.log('切换主题')
    const $link = createLink()
    $link.href = `${prefix}${theme}${suffix}`
    /**
     * 开启watch后，在IE 11浏览器点击切换主题开关不起作用。
     * 因此，每次切换主题时都重新执行cssVars()，还是无法切换主题，原因是开启watch后重新执行cssVars()是无效的。
     * 最后，只能先关闭watch再重新开启。
     */
    cssVars({
        watch: false,
    })
    setTimeout(function () {
        cssVars({
            watch: true,
        })
    }, 0)
    return theme
}

export { toggleTheme }
