"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvipBaseSettings = exports.ServerEmailSettings = void 0;
const internal_1 = require("../internal");
const verifyStorage_1 = require("../verifyStorage");
class NotImplementedError extends Error {
    constructor(name) {
        super(`${name} is not implemented`);
    }
}
class ServerEmailSettings {
    constructor(options) {
        this.prepareModel = () => ({
            title: "",
            subject: "",
            message: "",
        });
        this.server = options.server;
    }
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    send(request) {
        throw new NotImplementedError("ServerEmail");
    }
}
exports.ServerEmailSettings = ServerEmailSettings;
const hostnameRegex = /^(?:(?:https?|ftp):\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})$/;
class IvipBaseSettings {
    constructor(options = {}) {
        this.name = internal_1.DEFAULT_ENTRY_NAME;
        this.dbname = "root";
        this.logLevel = "log";
        this.storage = new verifyStorage_1.DataStorageSettings();
        this.isServer = false;
        this.isValidClient = false;
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (typeof options.dbname === "string") {
            this.dbname = options.dbname;
        }
        if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if ((0, verifyStorage_1.validSettings)(options.storage)) {
            this.storage = options.storage;
        }
        if (typeof options.host === "string" && hostnameRegex.test(options.host)) {
            this.host = options.host;
            this.isValidClient = true;
        }
        if (typeof options.port === "number") {
            this.port = options.port;
        }
    }
}
exports.IvipBaseSettings = IvipBaseSettings;
//# sourceMappingURL=browser.js.map