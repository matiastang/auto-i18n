/*
 * @Author: tangdaoyong
 * @Date: 2021-05-07 15:18:36
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-29 16:50:57
 * @Description: version 相关(更新package.json中的版本号：x.y.z-alpha.0)
 */
import gulp from 'gulp'
import bump from 'gulp-bump'
import { packageUrl } from '../constant/constant'

/**
 * 更新预发布版本号, 开发中版本, 可能会有较大改动.
 * @param {*} cb
 */
const versionPrerelease = function (cb: () => void) {
    gulp.src(packageUrl)
        .pipe(
            bump({
                type: 'prerelease',
            })
        )
        .pipe(gulp.dest('./'))
    cb()
}

/**
 * 更新 Z 版本号, 修复bug, 兼容老版本
 * @param {*} cb
 */
const versionPatch = function (cb: () => void) {
    gulp.src(packageUrl)
        .pipe(
            bump({
                type: 'patch',
            })
        )
        .pipe(gulp.dest('./'))
    cb()
}
/**
 * 更新 Y 版本号, 兼容老版本
 * @param {*} cb
 */
const versionMinor = function (cb: () => void) {
    gulp.src(packageUrl)
        .pipe(
            bump({
                type: 'minor',
            })
        )
        .pipe(gulp.dest('./'))
    cb()
}
/**
 * 更新 X 版本号, 不兼容老版本
 * @param {*} cb
 */
const versionMajor = function (cb: () => void) {
    gulp.src(packageUrl)
        .pipe(
            bump({
                type: 'major',
            })
        )
        .pipe(gulp.dest('./'))
    cb()
}
// 导出
export { versionPrerelease, versionPatch, versionMinor, versionMajor }
