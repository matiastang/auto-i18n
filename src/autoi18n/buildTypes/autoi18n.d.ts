import { App } from 'vue';
import { Autoi18nOptions, Autoi18nMessageValue } from './type';
export declare const autoi18nInfo: {
    messages: import("./type").Autoi18nMessages;
    filePath?: string;
    locale: import("./type").LocaleType;
    locales: import("./type").LocaleType[];
};
export declare const autoTranslate: (key: string, options?: {
    [key: string]: string | number;
}) => Autoi18nMessageValue;
declare const autoi18n: {
    install(app: App, options: Autoi18nOptions): Promise<void>;
};
export default autoi18n;
