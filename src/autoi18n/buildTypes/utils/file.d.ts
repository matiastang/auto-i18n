import { Autoi18nMessages } from '../type';
export declare const readJsonFile: (url: string) => Promise<Autoi18nMessages>;
export declare const readTranslateFile: (url: string) => Promise<string>;
export declare const readTranslateJson: (url: string) => Promise<Autoi18nMessages>;
export declare const writeTranslateFile: (url: string, data: string) => Promise<Boolean>;
export declare const writeTranslateJson: (url: string, data: Autoi18nMessages) => Promise<false | Boolean>;
