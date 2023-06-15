/*
 * @Author: matiastang
 * @Date: 2021-11-12 09:49:44
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-17 09:44:20
 * @FilePath: /datumwealth-openalpha-front/src/common/utils/check/userInfoCheck.ts
 * @Description: 用户信息校验
 */
/**
 * 邮箱校验
 * @param email 邮箱
 * @returns 错误提示 | 正确null
 */
function email_check(email: string): string | null {
    if (email.trim() == '') {
        return '请输入邮箱'
    }
    const reg = /^[a-zA-Z\d]+@[a-zA-Z\d]+.[a-zA-Z0-9.]{1,20}$/
    if (!reg.test(email)) {
        return '邮箱格式不正确'
    }
    return null
}
/**
 * 手机号校验
 * @param phone 手机号
 * @returns 结果
 */
function phone_check(phone: string): string | null {
    if (phone.trim() == '') {
        return '请输入手机号'
    }
    if (phone.length < 11) {
        return '请输入11位手机号'
    }
    const reg = /^[\d]{11}$/
    if (!reg.test(phone)) {
        return '手机号格式不正确'
    }
    return null
}

/**
 * 验证码校验
 * @param code 验证码
 * @returns 结果
 */
function code_check(code: string): string | null {
    if (code.trim() == '') {
        return '请输入验证码'
    }
    if (code.length !== 6) {
        return '请输入6位验证码'
    }
    const reg = /^[\d]{6}$/
    if (!reg.test(code)) {
        return '验证码格式不正确'
    }
    return null
}

/**
 * 密码校验
 * @param password 密码
 * @returns 结果
 */
function password_check(password: string, isChange: boolean = false): string | null {
    if (password.trim() == '') {
        return '请输入密码'
    }
    const loginReg = /^[A-Za-z\d]{6,20}$/
    if (!loginReg.test(password)) {
        return '密码为6-20位数字或字母'
    }
    if (!isChange) {
        return null
    }
    const reg = /^(?=.*[0-9])(?=.*[a-zA-Z])[A-Za-z\d]{6,30}$/
    if (!reg.test(password)) {
        return '密码格式为6-20位数字与字母组合'
    }
    return null
}

/**
 * 身份证校验
 * @param identityCard 身份证号
 * @returns 结果
 */
function identity_card_check(identityCard: string): string | null {
    if (identityCard.trim() == '') {
        return '请输入身份证号'
    }
    if (identityCard.length !== 15 && identityCard.length !== 18) {
        return '请输入十五位或十八位身份证号'
    }
    // 正则表达式
    // 十八位： ^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$
    // 十五位： ^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}$
    const regOne =
        /^[1-9]\d{5}(18|19|([23]\d))\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{3}[0-9Xx]$/
    const regTwo = /^[1-9]\d{5}\d{2}((0[1-9])|(10|11|12))(([0-2][1-9])|10|20|30|31)\d{2}$$/
    if (!regOne.test(identityCard) && !regTwo.test(identityCard)) {
        return '身份证号格式错误'
    }
    return null
}

/**
 * 身份证校验
 * @param organization 社会信用代码
 * @returns 结果
 */
function organization_code_check(organizationCode: string): string | null {
    if (organizationCode.trim() == '') {
        return '请输入社会信用代码'
    }
    const reg = /^([0-9A-HJ-NPQRTUWXY]{2}\d{6}[0-9A-HJ-NPQRTUWXY]{10}|[1-9]\d{14})$/
    if (!reg.test(organizationCode)) {
        return '社会信用代码格式错误'
    }
    return null
}

export {
    phone_check,
    code_check,
    password_check,
    email_check,
    identity_card_check,
    organization_code_check,
}
