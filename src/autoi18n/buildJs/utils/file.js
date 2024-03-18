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
Object.defineProperty(exports, "__esModule", { value: true });
exports.writeTranslateJson = exports.writeTranslateFile = exports.readTranslateJson = exports.readTranslateFile = exports.readJsonFile = void 0;
/*
 * @Author: matiastang
 * @Date: 2023-07-28 13:56:17
 * @LastEditors: matiastang
 * @LastEditTime: 2023-08-07 15:53:11
 * @FilePath: /auto-i18n/src/autoi18n/utils/file.ts
 * @Description: autoi18n file
 */
var fs = __importStar(require("fs"));
var readJsonFile = function (url) {
    return new Promise(function (resolve, reject) {
        var rawFile = new XMLHttpRequest();
        rawFile.overrideMimeType("application/json");
        rawFile.open("GET", url, true);
        rawFile.onreadystatechange = function () {
            if (rawFile.readyState !== 4 || rawFile.status !== 200) {
                return;
            }
            var content = rawFile.responseText;
            if (typeof content !== 'string' || !content) {
                reject('json is empty');
                return;
            }
            try {
                var jsonData = JSON.parse(content);
                resolve(jsonData);
            }
            catch (err) {
                reject(err);
            }
        };
        rawFile.send();
    });
};
exports.readJsonFile = readJsonFile;
var readTranslateFile = function (url) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                try {
                    fs.readFile(url, 'utf-8', function (err, data) {
                        if (err) {
                            reject(err);
                            return;
                        }
                        resolve(data);
                    });
                }
                catch (error) {
                    reject(error);
                }
            })];
    });
}); };
exports.readTranslateFile = readTranslateFile;
var readTranslateJson = function (url) { return __awaiter(void 0, void 0, void 0, function () {
    var fileContent, jsonData;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0: return [4 /*yield*/, (0, exports.readTranslateFile)(url)];
            case 1:
                fileContent = _a.sent();
                if (typeof fileContent !== 'string' || !fileContent) {
                    return [2 /*return*/, {}];
                }
                try {
                    jsonData = JSON.parse(fileContent);
                    return [2 /*return*/, jsonData];
                }
                catch (error) {
                    return [2 /*return*/, {}];
                }
                return [2 /*return*/];
        }
    });
}); };
exports.readTranslateJson = readTranslateJson;
var writeTranslateFile = function (url, data) { return __awaiter(void 0, void 0, void 0, function () {
    return __generator(this, function (_a) {
        return [2 /*return*/, new Promise(function (resolve, reject) {
                fs.writeFile(url, data, function (err) {
                    if (err) {
                        reject(err);
                        return;
                    }
                    resolve(true);
                });
            })];
    });
}); };
exports.writeTranslateFile = writeTranslateFile;
var writeTranslateJson = function (url, data) { return __awaiter(void 0, void 0, void 0, function () {
    var jsonStr, success, error_1;
    return __generator(this, function (_a) {
        switch (_a.label) {
            case 0:
                _a.trys.push([0, 2, , 3]);
                jsonStr = JSON.stringify(data);
                return [4 /*yield*/, (0, exports.writeTranslateFile)(url, jsonStr)];
            case 1:
                success = _a.sent();
                return [2 /*return*/, success];
            case 2:
                error_1 = _a.sent();
                return [2 /*return*/, false];
            case 3: return [2 /*return*/];
        }
    });
}); };
exports.writeTranslateJson = writeTranslateJson;
