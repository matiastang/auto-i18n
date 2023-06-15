/*
 * @Author: matiastang
 * @Date: 2021-12-29 14:13:47
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-29 14:54:22
 * @FilePath: /datumwealth-front-scaffold/src/common/extension/string/stringExtension.d.ts
 * @Description: 扩展声明
 */
declare global {
    interface String {
        /**
         * 手机号脱敏
         * '183812349615'.phoneDesensitization() => 1838****9615
         */
        phoneDesensitization(): string
    }
}
export {}
