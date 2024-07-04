"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.IvipBaseSettings = void 0;
const server_1 = require("../../server");
const browser_1 = require("./browser");
const nodemailer_1 = __importDefault(require("nodemailer"));
const juice_1 = __importDefault(require("juice"));
const getTemplateValueBy = (str, actions) => {
    var _a, _b;
    str = String(!str || String(str).trim() === "" ? "" : str);
    actions = !actions || typeof actions !== "object" ? {} : actions;
    const expression = /\{\{(([a-z0-9_\-]+\.?)+)\}\}/i;
    if (expression.test(str) !== true) {
        return str;
    }
    let path = (_a = (str !== null && str !== void 0 ? str : "").match(expression)) === null || _a === void 0 ? void 0 : _a[1];
    if (path) {
        let value = actions;
        path.split(".").forEach((key, i) => {
            value = value && typeof value === "object" && key in value ? value[key] : null;
        });
        value = typeof value === "function" ? value() : ["string", "number", "boolean"].includes(typeof value) ? value : "[[ERROR]]";
        str = str.replace(new RegExp("{{" + path + "}}", "gi"), (_b = value) !== null && _b !== void 0 ? _b : "");
    }
    return getTemplateValueBy(str, actions);
};
class ServerEmailSettings extends browser_1.ServerEmailSettings {
    constructor(options) {
        super(options);
        this.prepareModel = (request) => {
            let title = "iVipBase";
            let subject = "";
            let message = "";
            try {
            }
            catch (_a) { }
            return { title, subject, message };
        };
        if (typeof options.prepareModel === "function") {
            this.prepareModel = options.prepareModel;
        }
        this.transporter = nodemailer_1.default.createTransport({
            host: this.server.host,
            port: this.server.port,
            secure: this.server.secure,
            auth: {
                user: this.server.user,
                pass: this.server.pass,
            },
        });
    }
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    async send(request) {
        var _a;
        const { title, subject, message } = (_a = this.prepareModel(request)) !== null && _a !== void 0 ? _a : {
            title: "iVipBase",
            subject: "",
            message: "",
        };
        await this.transporter.sendMail({
            priority: "high",
            from: `${title} <${this.server.user}>`,
            to: request.user.email,
            subject: subject,
            text: subject,
            html: (0, juice_1.default)(getTemplateValueBy(message, request), { removeStyleTags: false }),
        });
    }
}
class IvipBaseSettings extends browser_1.IvipBaseSettings {
    constructor(options = {}) {
        super(options);
        this.options = options;
        this.isServer = false;
        this.isValidClient = false;
        this.reset(options, false);
    }
    get isPossiplyServer() {
        return true;
    }
    reset(options = {}, forceSuper = true) {
        if (forceSuper) {
            super.reset(options);
        }
        if (options.isServer && server_1.isPossiblyServer) {
            this.isServer = true;
            this.server = new server_1.ServerSettings(options);
            if (typeof options.email === "object") {
                this.email = new ServerEmailSettings(options.email);
            }
            this.isValidClient = false;
        }
    }
}
exports.IvipBaseSettings = IvipBaseSettings;
//# sourceMappingURL=index.js.map