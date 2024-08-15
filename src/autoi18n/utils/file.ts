/*
 * @Author: matiastang
 * @Date: 2023-07-28 13:56:17
 * @LastEditors: matiastang
 * @LastEditTime: 2024-08-15 18:04:06
 * @FilePath: /auto-i18n/src/autoi18n/utils/file.ts
 * @Description: autoi18n file
 */
import * as fs from 'fs'
import { Autoi18nMessages } from '../@types/autoi18n'

/**
 * 读取文件
 * @param url 
 * @returns 
 */
export const readJsonFile = (url: string) => {
    return new Promise<Autoi18nMessages>((resolve, reject) => {
        let rawFile = new XMLHttpRequest()
        rawFile.overrideMimeType("application/json")
        rawFile.open("GET", url, true)
        rawFile.onreadystatechange = function() {
            if (rawFile.readyState !== 4) {
                // MARK: - 未完成继续执行
                return
            }
            if (rawFile.status !== 200) {
                reject('redyJsonFile error')
                return
            }
            const content = rawFile.responseText
            if (typeof content !== 'string' || !content) {
                reject('json is empty')
                return
            }
            try {
                const jsonData: Autoi18nMessages = JSON.parse(content)
                resolve(jsonData)
            } catch (err) {
                console.warn(err)
                reject(err)
            }
        }
        rawFile.send()
    })
}

/**
 * 读取文件
 * @param url 
 * @returns 
 */
export const readTranslateFile = async (url: string) => {
    return new Promise<string>((resolve, reject) => {
        try {
            fs.readFile(url, 'utf-8', (err: NodeJS.ErrnoException, data: string) => {
                if (err) {
                    reject(err)
                    return
                }
                resolve(data)
            })
        } catch (error) {
            reject(error)
        }
    })
}

/**
 * 读取文件
 * @param url 
 * @returns 
 */
export const readTranslateJson = async (url: string) => {
    const fileContent = await readTranslateFile(url)
    if (typeof fileContent !== 'string' || !fileContent) {
        return {} as Autoi18nMessages
    }
    try {
        const jsonData: Autoi18nMessages = JSON.parse(fileContent)
        return jsonData
    } catch (error) {
        return {} as Autoi18nMessages
    }
}

/**
 * 写入文件
 * @param url 
 * @param data 
 * @returns 
 */
export const writeTranslateFile = async (url: string, data: string) => {
    return new Promise<Boolean>((resolve, reject) => {
        fs.writeFile(url, data, (err: NodeJS.ErrnoException | null) => {
            if (err) {
                reject(err)
                return
            }
            resolve(true)
        })
    })
}

/**
 * 写入文件
 * @param url 
 * @param data 
 * @returns 
 */
export const writeTranslateJson = async (url: string, data: Autoi18nMessages) => {
    try {
        const jsonStr = JSON.stringify(data)
        const success = await writeTranslateFile(url, jsonStr)
        return success
    } catch (error) {
        return false
    }
}