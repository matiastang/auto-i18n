/*
 * @Author: matiastang
 * @Date: 2021-11-12 11:42:05
 * @LastEditors: matiastang
 * @LastEditTime: 2021-11-18 14:46:16
 * @FilePath: /datumwealth-openalpha-front/src/common/utils/storage/localStorage.ts
 * @Description: LocalStorage简单封装
 */
/**
 * local storage key
 */
const localStorageKey = {
    /**
     * 用户token key
     */
    userTokenKey: 'USER_TOKEN_KEY',
    /**
     * 用户信息key
     */
    userInfoKey: 'USER_INFO_KEY',
    /**
     * vux key
     */
    vuexKey: 'vuex',
}
/**
 * 存储LocalStorage数据
 * @param key 存储key
 * @param value 存储值
 */
function localStorageWrite(key: string, value: object | string | boolean | number | symbol) {
    let saveValue = ''
    if (typeof value === 'object') {
        saveValue = JSON.stringify({
            value,
        })
    }
    if (typeof value === 'string') {
        saveValue = JSON.stringify({
            value,
        })
    }
    if (typeof value === 'boolean' || typeof value === 'number' || typeof value === 'symbol') {
        saveValue = JSON.stringify({
            value: value.toString(),
        })
    }
    localStorage.setItem(key, saveValue)
}

/**
 * 读取LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
function localStorageRead<T>(key: string): T | null {
    const value = localStorage.getItem(key)
    if (typeof value === 'string') {
        try {
            return <T>JSON.parse(value).value
        } catch (error) {
            console.warn(error)
            return null
        }
    }
    return null
}

/**
 * 清除LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
function localStorageRemove(key: string) {
    localStorage.removeItem(key)
}

/**
 * 清除所有LocalStorage数据
 * @param key 存储key
 * @returns 返回类型
 */
function localStorageRemoveAll() {
    localStorage.clear()
}

export {
    localStorageKey,
    localStorageWrite,
    localStorageRead,
    localStorageRemove,
    localStorageRemoveAll,
}
