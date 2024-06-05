"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addMiddleware = void 0;
const byteLength = (str) => {
    let s = str.length;
    for (let i = str.length - 1; i >= 0; i--) {
        let code = str.charCodeAt(i);
        if (code > 0x7f && code <= 0x7ff)
            s++;
        else if (code > 0x7ff && code <= 0xffff)
            s += 2;
        if (code >= 0xdc00 && code <= 0xdfff)
            i--;
    }
    return s;
};
const addMiddleware = (env) => {
    const info = {};
    const getLogBytesUsage = () => {
        return new Promise((resolve, reject) => {
            const result = {};
            for (let dbName in info) {
                const { lastTime, requestBytes, responseBytes } = info[dbName];
                const duration = Date.now() - lastTime;
                const deltaTime = duration / 1000;
                const request = requestBytes / deltaTime;
                const response = responseBytes / deltaTime;
                info[dbName] = {
                    lastTime: Date.now(),
                    requestBytes: 0,
                    responseBytes: 0,
                };
                result[dbName] = {
                    request,
                    response,
                };
            }
            resolve(result);
        });
    };
    const appendLogBytesUsage = (dbname, requestBytes, responseBytes, notify = true) => {
        var _a;
        if (!info[dbname]) {
            info[dbname] = {
                lastTime: Date.now(),
                requestBytes: 0,
                responseBytes: 0,
            };
        }
        info[dbname].requestBytes += requestBytes;
        info[dbname].responseBytes += responseBytes;
        if (notify) {
            (_a = env.localApp.ipc) === null || _a === void 0 ? void 0 : _a.sendNotification({
                type: "logBytesUsage",
                dbname,
                requestBytes: info[dbname].requestBytes,
                responseBytes: info[dbname].responseBytes,
            });
        }
    };
    env.localApp.ipcReady((ipc) => {
        ipc.on("notification", (message) => {
            if (message.type === "logBytesUsage") {
                appendLogBytesUsage(message.dbname, message.requestBytes, message.responseBytes, false);
            }
        });
    });
    env.router.use(async (req, res, next) => {
        var _a, _b;
        const dbname = (_b = (_a = req.params["dbName"]) !== null && _a !== void 0 ? _a : req.database_name) !== null && _b !== void 0 ? _b : "__default__";
        // Contabiliza os bytes da requisição
        req.on("data", (chunk) => {
            appendLogBytesUsage(dbname, chunk.length, 0);
        });
        const data = JSON.stringify({ body: req.body, query: req.query, params: req.params });
        appendLogBytesUsage(dbname, byteLength(data), 0);
        // Contabiliza os bytes da resposta
        const originalWrite = res.write;
        const originalEnd = res.end;
        const originalJson = res.json;
        const originalSend = res.send;
        res.write = function (chunk, encoding, callback) {
            appendLogBytesUsage(dbname, 0, chunk.length);
            originalWrite.call(res, chunk, encoding, callback);
        };
        res.end = function (chunk, encoding, callback) {
            if (chunk) {
                appendLogBytesUsage(dbname, 0, chunk.length);
            }
            originalEnd.call(res, chunk, encoding, callback);
        };
        res.json = function (body) {
            appendLogBytesUsage(dbname, 0, byteLength(JSON.stringify(body)));
            originalJson.call(res, body);
        };
        res.send = function (body) {
            appendLogBytesUsage(dbname, 0, byteLength(String(body)));
            originalSend.call(res, body);
        };
        next();
    });
    return getLogBytesUsage;
};
exports.addMiddleware = addMiddleware;
exports.default = exports.addMiddleware;
//# sourceMappingURL=log-bytes.js.map