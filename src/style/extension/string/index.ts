/*
 * @Author: matiastang
 * @Date: 2021-12-29 14:05:56
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-29 14:55:20
 * @FilePath: /datumwealth-front-scaffold/src/common/extension/string/index.ts
 * @Description: string扩展
 */
String.prototype.phoneDesensitization = () => {
    const phone = String(self)
    if (phone.length <= 3) {
        return phone
    }
    if (phone.length === 4) {
        return phone.substring(0, 3) + '*'
    }
    if (phone.length === 5) {
        return phone.substring(0, 3) + '**'
    }
    if (phone.length === 6) {
        return phone.substring(0, 3) + '***'
    }
    return phone.substring(0, 3) + '****' + phone.substring(7, phone.length)
}
