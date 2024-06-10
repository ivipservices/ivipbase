"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
const error_1 = require("./error");
const axios_1 = __importDefault(require("axios"));
/**
 * @returns returns a promise that resolves with an object containing data and an optionally returned context
 */
async function request(method, url, options = { accessToken: null, data: null, dataReceivedCallback: null, dataRequestCallback: null, context: null }) {
    var _a, _b, _c;
    let postData = options.data;
    if (typeof postData === "undefined" || postData === null) {
        postData = "";
    }
    else if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(postData))) {
        postData = JSON.stringify(postData);
    }
    const headers = {
        "DataBase-Context": JSON.stringify(options.context || null),
    };
    const request = {
        url,
        method,
        headers,
        data: undefined,
        onUploadProgress: options.onUploadProgress,
        onDownloadProgress: options.onDownloadProgress,
        responseType: options.dataReceivedCallback ? "arraybuffer" : "text",
    };
    if (typeof options.dataRequestCallback === "function") {
        // Stream data to the server instead of posting all from memory at once
        headers["Content-Type"] = "text/plain"; // Prevent server middleware parsing the content as JSON
        postData = "";
        const chunkSize = 1024 * 512; // Use large chunk size, we have to store everything in memory anyway.
        let chunk;
        while ((chunk = await options.dataRequestCallback(chunkSize))) {
            postData += chunk;
        }
        request.data = postData;
    }
    else if (postData.length > 0) {
        headers["Content-Type"] = "application/json";
        request.data = postData;
    }
    if (options.accessToken) {
        headers["Authorization"] = `Bearer ${options.accessToken}`;
    }
    const res = await (0, axios_1.default)(request).catch((err) => {
        // console.error(err);
        throw new error_1.RequestError(request, null, "fetch_failed", err.message);
    });
    // const res = await fetch(request.url, request).catch((err) => {
    // 	// console.error(err);
    // 	throw new RequestError(request, null, "fetch_failed", err.message);
    // });
    let data = res.data;
    if (typeof options.dataReceivedCallback === "function") {
        options.dataReceivedCallback(res.data);
    }
    const isJSON = data[0] === "{" || data[0] === "["; // || (res.headers['content-type'] || '').startsWith('application/json')
    if (res.status !== 200) {
        const response = {
            statusCode: res.status,
            statusMessage: res.statusText,
            headers: res.headers,
            body: data,
        };
        let code = res.status, message = res.statusText;
        if (isJSON) {
            const err = JSON.parse(data);
            if (err.code) {
                code = err.code;
            }
            if (err.message) {
                message = err.message;
            }
        }
        else if ("code" in data || "message" in data) {
            code = (_a = data.code) !== null && _a !== void 0 ? _a : res.status;
            message = (_b = data.message) !== null && _b !== void 0 ? _b : res.statusText;
        }
        throw new error_1.RequestError(Object.assign(Object.assign({}, request), { body: postData }), response, code, message);
    }
    const contextHeader = (_c = res.headers["DataBase-Context"]) !== null && _c !== void 0 ? _c : res.headers["database-context"];
    let context;
    if (contextHeader && contextHeader[0] === "{") {
        context = JSON.parse(contextHeader);
    }
    else {
        context = {};
    }
    if (isJSON) {
        data = JSON.parse(data);
    }
    return { context, data };
}
exports.default = request;
//# sourceMappingURL=index.js.map