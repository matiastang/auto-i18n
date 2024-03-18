import { Autoi18nMessages } from '../type';
export * from './file';
/**
 * 提取翻译转换
 * @param code
 * @returns
 */
export declare const detectionTranslateMsg: (code: string) => string[];
/**
 * 提取翻译文本
 * @param tText
 * @returns
 */
export declare const detectionTranslateText: (msg: string) => string | null;
/**
 * 提取翻译key
 * @param tText
 * @returns
 */
export declare const translateHashKey: (tText: string, isJson?: Boolean) => string;
/**
 * 检查key
 * @param code
 * @returns
 */
export declare const checkQuestions: (code: string) => string[];
/**
 * 转换映射内容
 * @param msg
 */
export declare const devTransformMessages: (msg: Autoi18nMessages) => string;
/**
 * 注入
 * @param code
 * @param msg
 */
export declare const devInjectMessages: (code: string, msg: string) => string;
/**
 * 转换方法替换
 * @param code
 * @returns
 */
export declare const devTransformMethod: (code: string) => string;
