/*
 * @Author: matiastang
 * @Date: 2022-01-05 15:57:32
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-18 17:46:59
 * @FilePath: /auto-i18n/gulpfile.ts/tasks/vueTheme.ts
 * @Description: vue提取样式
 */
import gulp, { src, dest, series, parallel } from 'gulp'
import dartSass from 'sass'
import gulpSass from 'gulp-sass'
const sass = gulpSass(dartSass)
import autoprefixer from 'gulp-autoprefixer'
// import cssmin from 'gulp-cssmin'
import { deleteSync } from 'del'
import minimist from 'minimist'

// 打包配置
const config = {
    input: '../../components/dwWechatLogin/src/',
    output: '../../dist/theme-default',
}
// 复制字体
const copy_font = () => {
    gulp.src([`${config.input}fonts/*`, `!${config.input}fonts/*.css`]).pipe(
        dest(`${config.output}/fonts`)
    )
}
// 压缩font 里的 CSS
// exports.minifontCss = () =>
//     src(`${config.input}fonts/*.css`)
//         .pipe(cssmin())
//         .pipe(dest(`${config.output}/fonts`))
// 删除之前css打包文件
const vue_theme_clear = (cb: () => void) => {
    deleteSync(['./dist/css'])
    cb()
}

// 编译 SCSS
// const compile = () =>
//     src([`${input}*.less`, ...['base', 'variable'].map((name) => `!${input}${name}.less`)])
//         .pipe(less())
//         .pipe(
//             autoprefixer({
//                 overrideBrowserslist: ['last 2 versions'],
//             })
//         )
//         .pipe(cssmin())
//         .pipe(dest(output))
// exports.build = series(clean, parallel(compile, copyfont, minifontCss))

const vue_build_theme = (cb: () => void) => {
    const argv = minimist(process.argv.slice(2))
    const inPath = argv.in || './components'
    if (!inPath) {
        console.error(`vue_build_theme指令需要添加输入路径in`)
        cb()
        return
    }
    const outPath = argv.out || './dist/css'
    if (!outPath) {
        console.error(`vue_build_theme指令需要添加输出路径out`)
        cb()
        return
    }
    gulp.src(['./src/common/css/theme.scss', `${inPath}/**/*.scss`])
        // .pipe(sass.sync({ outputStyle: 'compressed' }).on('error', sass.logError))
        .pipe(sass.sync().on('error', sass.logError))
        .pipe(autoprefixer())
        // .pipe(cssmin())
        .pipe(gulp.dest(outPath))
    cb()
}

const vue_clear_build = gulp.series(vue_theme_clear, vue_build_theme)

export { vue_theme_clear, vue_build_theme, vue_clear_build }

export default {};
