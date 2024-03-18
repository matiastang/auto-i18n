"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g;
    return g = { next: verb(0), "throw": verb(1), "return": verb(2) }, typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
// import { InputOptions, ModuleInfo, LogLevel, RollupLog, AcornNode, OutputOptions } from 'rollup'
var utils_1 = require("./utils");
var lodash_1 = require("lodash");
var path_1 = __importDefault(require("path"));
var autoi18nData = {
    locale: 'zh',
    locales: ['zh', 'en'],
    messages: {}
};
/**
 * dev 开发转换
 * @param code
 * @param id
 */
var devTransformModule = function (code, id, translate) { return __awaiter(void 0, void 0, void 0, function () {
    var texts, mQuestions, list, local, locals, cacheMessages, tos, messages, msgText, autoi18nInject, injectMsgCode, replaceMethodCode;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                texts = (0, utils_1.checkQuestions)(code);
                mQuestions = new Set(texts);
                list = Array.from(mQuestions);
                if (list.length <= 0) {
                    return [2 /*return*/, code];
                }
                local = autoi18nData.locale;
                locals = autoi18nData.locales;
                cacheMessages = autoi18nData.messages;
                tos = locals.filter(function (item) { return item !== local; });
                if (tos.length <= 0) {
                    return [2 /*return*/, code];
                }
                return [4 /*yield*/, translate(list, tos, local, cacheMessages)];
            case 1:
                messages = _a.sent();
                console.log('============1');
                console.log(messages);
                if (messages) {
                    autoi18nData.isTranslate = true;
                    (0, lodash_1.merge)(cacheMessages, messages);
                }
                else {
                    messages = cacheMessages;
                }
                if (!autoi18nData.isDev) {
                    return [2 /*return*/, code];
                }
                console.log('============2');
                console.log(messages);
                msgText = (0, utils_1.devTransformMessages)(messages);
                console.log('============3');
                console.log(msgText);
                autoi18nInject = "\n    import { inject } from 'vue'\n    import { translateHashKey } from '@autoi18n/utils'\n    import { Autoi18nType, Autoi18nMessages, Autoi18nMessageItem, Autoi18nMessageValue } from '@autoi18n/type'\n\n    const _autoi18n = inject<Autoi18nType>('$autoi18n')\n\n    const _localeMessages: Autoi18nMessages = ".concat(msgText, "\n\n    const _localeTranslate = (key: string, options?: {[key: string]: string | number}) => {\n        const locale = _autoi18n.locale\n        const localeKey = translateHashKey(key)\n        const item = _localeMessages[localeKey] as Autoi18nMessageItem\n        if (!item) {\n            return key\n        }\n        const value = item[locale] as Autoi18nMessageValue\n        if (!value) {\n            return key\n        }\n        if (options) {\n            return Object.entries(options).reduce((left, item) => {\n                const [_key, _val] = item\n                return String(left).replaceAll('{' + _key + '}', _val)\n            }, value)\n        }\n        return value\n    }\n    ");
                injectMsgCode = (0, utils_1.devInjectMessages)(code, autoi18nInject);
                replaceMethodCode = (0, utils_1.devTransformMethod)(injectMsgCode);
                return [2 /*return*/, replaceMethodCode];
        }
    });
}); };
var autoi18nPlugin = function (autoi18nOptions) {
    return {
        name: 'html-transform',
        version: '0.0.1',
        // /**
        //  * vite hook
        //  * @param html 
        //  * @returns 
        //  */
        // async transformIndexHtml(html: string) {
        //     console.info('transformIndexHtml')
        //     return html.replace(
        //     /<title>(.*?)<\/title>/,
        //     `<title>autoi18n</title>`,
        //     )
        // },
        /**
         * --------- 构建 ---------
         */
        /**
         * 构建完成，构建阶段的最后一个钩子
         */
        buildEnd: function (error) {
            return __awaiter(this, void 0, void 0, function () {
                var isTranslate, filePath, success;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.info('buildEnd', autoi18nData.messages);
                            isTranslate = autoi18nData.isTranslate;
                            if (!isTranslate) {
                                return [2 /*return*/];
                            }
                            filePath = autoi18nOptions.filePath || path_1.default.resolve(__dirname, './translate.json');
                            return [4 /*yield*/, (0, utils_1.writeTranslateJson)(filePath, autoi18nData.messages)];
                        case 1:
                            success = _a.sent();
                            console.info("\u5199\u5165".concat(success));
                            return [2 /*return*/];
                    }
                });
            });
        },
        /**
         * 构建开始
         */
        buildStart: function (options) {
            return __awaiter(this, void 0, void 0, function () {
                var filePath, fileContent, configLocal, configLocals;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.info('buildStart');
                            filePath = autoi18nOptions.filePath || path_1.default.resolve(__dirname, './translate.json');
                            return [4 /*yield*/, (0, utils_1.readTranslateJson)(filePath)];
                        case 1:
                            fileContent = _a.sent();
                            console.info(filePath, fileContent);
                            configLocal = autoi18nOptions.locale;
                            if (configLocal) {
                                autoi18nData.locale = configLocal;
                            }
                            configLocals = autoi18nOptions.locales;
                            if (configLocals) {
                                autoi18nData.locales = configLocals;
                            }
                            autoi18nData.isDev = autoi18nOptions.isDev;
                            autoi18nData.messages = fileContent;
                            return [2 /*return*/];
                    }
                });
            });
        },
        /**
         * 观察器进程即将关闭时通知插件
         */
        // async closeWatcher() {
        // },
        /**
         * 加载
         * @param id
         * @returns
         */
        // async load(id: string) {
        //     console.info('load')
        //     if (id === 'virtual-module') {
        //       // "virtual-module"的源代码
        //       return 'export default "This is virtual!"';
        //     }
        //     return null; // 其他ID应按通常方式处理
        // },
        /**
         * 每次 Rollup 完全解析一个模块时，都会调用此钩子
         * @param moduleInfo
         */
        // async moduleParsed(moduleInfo: ModuleInfo) {
        //     console.info('moduleParsed', moduleInfo)
        // },
        // onLog(level: LogLevel, log: RollupLog) {
        //     console.info('onLog')
        //     return null
        // },
        /**
         * 这是构建阶段的第一个钩子
         * @param options
         * @returns
         */
        // async options(options: InputOptions) {
        //     console.info('options')
        //     return options
        // },
        /**
         * 动态导入定义自定义解析器
         * @param specifier
         * @param importer
         * @param options
         */
        // async resolveDynamicImport(
        //     specifier: string | AcornNode,
        //     importer: string,
        //     options: {
        //         assertions: Record<string, string>
        //     }
        // ) {
        //     console.info('resolveDynamicImport')
        //     return null
        // },
        /**
         * 定义一个自定义解析器
         * @param source
         * @param importer
         * @param options
         * @returns
         */
        // async resolveId(
        //     source: string,
        //     importer: string | undefined,
        //     options: {
        //         assertions: Record<string, string>;
        //         custom?: { [plugin: string]: any };
        //         isEntry: boolean;
        //     }
        // ) {
        //     console.info('resolveId')
        //     if (source === 'virtual-module') {
        //         // 这表示 rollup 不应询问其他插件或
        //         // 从文件系统检查以找到此 ID
        //         return source;
        //     }
        //     return null // 其他ID应按通常方式处理
        // },
        // async shouldTransformCachedModule(options: {
        //     ast: AcornNode;
        //     code: string;
        //     id: string;
        //     meta: { [plugin: string]: any };
        //     moduleSideEffects: boolean | 'no-treeshake';
        //     syntheticNamedExports: boolean | string;
        // }) {
        //     console.info('shouldTransformCachedModule', options.id)
        //     return true
        // },
        /**
         * 用于转换单个模块
         * @param code
         * @param id
         * @returns
         */
        transform: function (code, id) {
            return __awaiter(this, void 0, void 0, function () {
                var res;
                return __generator(this, function (_a) {
                    switch (_a.label) {
                        case 0:
                            console.info('transform：', id);
                            if (!id.endsWith('.vue')) return [3 /*break*/, 2];
                            return [4 /*yield*/, devTransformModule(code, id, autoi18nOptions.translate)];
                        case 1:
                            res = _a.sent();
                            return [2 /*return*/, res];
                        case 2: return [2 /*return*/, null];
                    }
                });
            });
        },
        /**
         * 在 --watch 模式下，每当 Rollup 检测到监视文件的更改时，就会通知插件
         * @param id
         * @param change
         */
        // async watchChange(id: string, change: {event: 'create' | 'update' | 'delete'}) {
        // },
        /**
         * --------- 输出 ---------
         */
        /**
         * 为每个 Rollup 输出块调用。返回 falsy 值不会修改哈希值
         * @param chunkInfo
         * @returns
         */
        // augmentChunkHash(chunkInfo: any) {
        //     console.info('augmentChunkHash')
        //     return 'falsy'
        // },
        // banner: string | ((chunk: ChunkInfo) => string)
        // async banner() {}
        // closeBundle: () => Promise<void> | void
        // async closeBundle() {}
        // AssetInfo | ChunkInfo
        // async generateBundle(options: OutputOptions, bundle: { [fileName: string]: any }, isWrite: boolean) {
        //     console.info('generateBundle')
        //     // // 省略一些边界情况的处理
        //     // // 1. 获取打包后的文件
        //     // const files = getFiles(bundle);
        //     // // 2. 组装 HTML，插入相应 meta、link 和 script 标签
        //     // const source = await template({ attributes, bundle, files, meta, publicPath, title});
        //     // // 3. 通过上下文对象的 emitFile 方法，输出 html 文件
        //     // const htmlFile: EmittedAsset = {
        //     //     type: 'asset',
        //     //     source,
        //     //     name: 'Rollup HTML Asset',
        //     //     fileName
        //     // }
        //     // this.emitFile(htmlFile)
        // }
    };
};
exports.default = autoi18nPlugin;
