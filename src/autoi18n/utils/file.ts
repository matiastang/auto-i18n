/*
 * @Author: matiastang
 * @Date: 2023-07-28 13:56:17
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-28 15:04:58
 * @FilePath: /auto-i18n/src/autoi18n/utils/file.ts
 * @Description: autoi18n file
 */
import fs from 'fs'
import { Autoi18nMessages } from '../type'

export const readTranslateFile = async (url: string) => {
    return new Promise<string>((resolve, reject) => {
        fs.readFile(url, 'utf-8', (err: NodeJS.ErrnoException, data: string) => {
            if (err) {
                reject(err)
                return
            }
            resolve(data)
        })
    })
}

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

export const writeTranslateJson = async (url: string, data: Autoi18nMessages) => {
    try {
        const jsonStr = JSON.stringify(data)
        const success = await writeTranslateFile(url, jsonStr)
        return success
    } catch (error) {
        return false
    }
}