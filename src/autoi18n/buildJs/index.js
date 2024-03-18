"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.translateHashKey = exports.autoi18nPlugin = exports.autoTranslate = exports.autoi18nInfo = exports.autoi18n = void 0;
/*
 * @Author: matiastang
 * @Date: 2023-07-13 17:54:19
 * @LastEditors: matiastang
 * @LastEditTime: 2023-07-31 19:38:35
 * @FilePath: /auto-i18n/src/autoi18n/index.ts
 * @Description: autoi18n
 */
var autoi18n_1 = __importStar(require("./autoi18n"));
exports.autoi18n = autoi18n_1.default;
Object.defineProperty(exports, "autoi18nInfo", { enumerable: true, get: function () { return autoi18n_1.autoi18nInfo; } });
Object.defineProperty(exports, "autoTranslate", { enumerable: true, get: function () { return autoi18n_1.autoTranslate; } });
var autoi18nPlugin_1 = __importDefault(require("./autoi18nPlugin"));
exports.autoi18nPlugin = autoi18nPlugin_1.default;
var utils_1 = require("./utils");
Object.defineProperty(exports, "translateHashKey", { enumerable: true, get: function () { return utils_1.translateHashKey; } });
