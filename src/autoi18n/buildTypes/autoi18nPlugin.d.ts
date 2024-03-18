import { InputOptions } from 'rollup';
import { LocaleType, Autoi18nMessages } from './type';
declare const autoi18nPlugin: (autoi18nOptions: {
    filePath?: string;
    isDev?: Boolean;
    locale?: LocaleType;
    locales?: LocaleType[];
    translate?: (questions: string[], tos: LocaleType[], from: LocaleType, cache?: Autoi18nMessages) => Promise<Autoi18nMessages | null>;
}) => {
    name: string;
    version: string;
    /**
     * --------- 构建 ---------
     */
    /**
     * 构建完成，构建阶段的最后一个钩子
     */
    buildEnd(error?: Error): Promise<void>;
    /**
     * 构建开始
     */
    buildStart(options: InputOptions): Promise<void>;
    /**
     * 观察器进程即将关闭时通知插件
     */
    /**
     * 加载
     * @param id
     * @returns
     */
    /**
     * 每次 Rollup 完全解析一个模块时，都会调用此钩子
     * @param moduleInfo
     */
    /**
     * 这是构建阶段的第一个钩子
     * @param options
     * @returns
     */
    /**
     * 动态导入定义自定义解析器
     * @param specifier
     * @param importer
     * @param options
     */
    /**
     * 定义一个自定义解析器
     * @param source
     * @param importer
     * @param options
     * @returns
     */
    /**
     * 用于转换单个模块
     * @param code
     * @param id
     * @returns
     */
    transform(code: string, id: string): Promise<string>;
};
export default autoi18nPlugin;
