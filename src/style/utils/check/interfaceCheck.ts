/*
 * @Author: matiastang
 * @Date: 2021-11-11 17:58:07
 * @LastEditors: matiastang
 * @LastEditTime: 2021-12-06 14:20:33
 * @FilePath: /datumwealth-openalpha-front/src/common/utils/check/interfaceCheck.ts
 * @Description: 接口信息校验
 */

/**
 * 接口id校验
 * @param id 接口id
 * @returns 是否符合规则
 */
function interface_id_check(id: number) {
    if (id > 0) {
        return true
    }
    console.warn('接口id为无效值')
    return false
}

/**
 * 接口分类id校验
 * @param id 接口id
 * @returns 是否符合规则
 */
function category_id_check(id: number) {
    if (id > 0) {
        return true
    }
    console.warn('接口分类id为无效值')
    return false
}

/**
 * 是否空对象
 * @param obj
 * @returns
 */
function is_empty_obj(obj: object) {
    return Object.keys(obj).length === 0
}

export { interface_id_check, category_id_check, is_empty_obj }
