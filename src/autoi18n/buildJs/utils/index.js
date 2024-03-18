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
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.devTransformMethod = exports.devInjectMessages = exports.devTransformMessages = exports.checkQuestions = exports.translateHashKey = exports.detectionTranslateText = exports.detectionTranslateMsg = void 0;
/*
 * @Author: matiastang
 * @Date: 2023-07-24 15:04:08
 * @LastEditors: matiastang
 * @LastEditTime: 2024-03-18 14:52:17
 * @FilePath: /auto-i18n/src/autoi18n/utils/index.ts
 * @Description: utils
 */
var crypto_js_1 = __importDefault(require("crypto-js"));
__exportStar(require("./file"), exports);
/**
 * 提取翻译转换
 * @param code
 * @returns
 */
var detectionTranslateMsg = function (code) {
    // TODO: - 正则合并及精准匹配
    var msgs = [];
    var RE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?\)/g;
    var reTranslates = code.match(RE);
    if (Array.isArray(reTranslates) && reTranslates.length > 0) {
        msgs.push.apply(msgs, reTranslates.map(function (item) { return item; }));
    }
    var optionRE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g;
    var optionReTranslates = code.match(optionRE);
    if (Array.isArray(optionReTranslates) && optionReTranslates.length > 0) {
        msgs.push.apply(msgs, optionReTranslates.map(function (item) { return item; }));
    }
    var autoReTranslates = code.match(/autoTranslate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?\)/g);
    if (Array.isArray(autoReTranslates) && autoReTranslates.length > 0) {
        msgs.push.apply(msgs, autoReTranslates.map(function (item) { return item; }));
    }
    var autoOptionReTranslates = code.match(/autoTranslate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g);
    if (Array.isArray(autoOptionReTranslates) && autoOptionReTranslates.length > 0) {
        msgs.push.apply(msgs, autoOptionReTranslates.map(function (item) { return item; }));
    }
    console.log(reTranslates, optionReTranslates, msgs);
    return msgs;
};
exports.detectionTranslateMsg = detectionTranslateMsg;
/**
 * 提取翻译文本
 * @param tText
 * @returns
 */
var detectionTranslateText = function (msg) {
    var textRE = /\$translate\([\`'"](.*)[\`'"].*/g;
    var textRes = textRE.exec(msg);
    if (!Array.isArray(textRes) || textRes.length <= 1) {
        console.log("".concat(msg, " not extract text"));
        var autoTextRE = /autoTranslate\([\`'"](.*)[\`'"].*/g;
        var autoTextRes = autoTextRE.exec(msg);
        if (!Array.isArray(autoTextRes) || autoTextRes.length <= 1) {
            console.log("".concat(msg, " not extract text"));
            return null;
        }
        return autoTextRes[1];
    }
    console.log("".concat(msg, " extract: ").concat(textRes[1]));
    return textRes[1];
};
exports.detectionTranslateText = detectionTranslateText;
/**
 * 提取翻译key
 * @param tText
 * @returns
 */
var translateHashKey = function (tText, isJson) {
    if (isJson === void 0) { isJson = false; }
    var hash = crypto_js_1.default.MD5(tText).toString();
    // if (isJson) {
    //     return `'${hash}'`
    // }
    return "autoi18n_".concat(hash);
};
exports.translateHashKey = translateHashKey;
/**
 * 检查key
 * @param code
 * @returns
 */
var checkQuestions = function (code) {
    var translates = (0, exports.detectionTranslateMsg)(code);
    if (!Array.isArray(translates) || translates.length <= 0) {
        return [];
    }
    var questions = translates.map(function (item) {
        var text = (0, exports.detectionTranslateText)(item);
        if (!text) {
            return null;
        }
        return text;
    }).filter(function (item) { return item; });
    console.log('--------');
    console.log(questions);
    return questions;
};
exports.checkQuestions = checkQuestions;
/**
 * 转换映射内容
 * @param msg
 */
var devTransformMessages = function (msg) {
    var localTransform = function (info) {
        return Object.entries(info).reduce(function (left, item) {
            var key = item[0], value = item[1];
            return left + "    ".concat(key, ": '").concat(value, "',\n");
        }, '{\n') + '  },\n';
    };
    return Object.entries(msg).reduce(function (left, item) {
        var key = item[0], value = item[1];
        return left + "  ".concat(key, ": ").concat(localTransform(value));
    }, '{\n') + '}\n';
};
exports.devTransformMessages = devTransformMessages;
/**
 * 注入
 * @param code
 * @param msg
 */
var devInjectMessages = function (code, msg) {
    return code.replace(/(\<script.*\>)/, "$1\n".concat(msg, "\n"));
};
exports.devInjectMessages = devInjectMessages;
/**
 * 转换方法替换
 * @param code
 * @returns
 */
var devTransformMethod = function (code) {
    return code.replace(/\$translate/g, '_localeTranslate').replace(/autoTranslate\(/g, '_localeTranslate(');
};
exports.devTransformMethod = devTransformMethod;
// const test = () => {
//     const code = `$translate(\`基金圈：{name}\`, {
//         name: orgName
//     })`
//     const optionRE = /\$translate\([\s\n.]?[`'"](.*)[`'"][\s\n.]?,/g
//     const optionReTranslates = code.match(optionRE)
//     console.log(optionReTranslates)
// }
// test()
// console.log(detectionTranslateText('$translate(`基金圈：{name}`'))
