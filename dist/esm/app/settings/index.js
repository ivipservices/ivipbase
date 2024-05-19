import { ServerSettings, isPossiblyServer } from "../../server/index.js";
import { IvipBaseSettings as BrowserSettings, ServerEmailSettings as BrowserEmailSettings } from "./browser.js";
import NodeMailer from "nodemailer";
import juice from "juice";
const getTemplateValueBy = (str, actions) => {
    str = String(!str || String(str).trim() === "" ? "" : str);
    actions = !actions || typeof actions !== "object" ? {} : actions;
    const expression = /\{\{(([a-z0-9_\-]+\.?)+)\}\}/i;
    if (expression.test(str) !== true) {
        return str;
    }
    let path = (str ?? "").match(expression)?.[1];
    if (path) {
        let value = actions;
        path.split(".").forEach((key, i) => {
            value = value && typeof value === "object" && key in value ? value[key] : null;
        });
        value = typeof value === "function" ? value() : ["string", "number", "boolean"].includes(typeof value) ? value : "[[ERROR]]";
        str = str.replace(new RegExp("{{" + path + "}}", "gi"), value ?? "");
    }
    return getTemplateValueBy(str, actions);
};
class ServerEmailSettings extends BrowserEmailSettings {
    constructor(options) {
        super(options);
        this.prepareModel = (request) => {
            let title = "iVipBase";
            let subject = "";
            let message = "";
            try {
            }
            catch { }
            return { title, subject, message };
        };
        if (typeof options.prepareModel === "function") {
            this.prepareModel = options.prepareModel;
        }
        this.transporter = NodeMailer.createTransport({
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
        const { title, subject, message } = this.prepareModel(request);
        await this.transporter.sendMail({
            priority: "high",
            from: `${title} <${this.server.user}>`,
            to: request.user.email,
            subject: subject,
            text: subject,
            html: juice(getTemplateValueBy(message, request), { removeStyleTags: false }),
        });
    }
}
export class IvipBaseSettings extends BrowserSettings {
    constructor(options = {}) {
        super(options);
        this.options = options;
        this.isServer = false;
        this.isValidClient = false;
        this.reset(options, false);
    }
    reset(options = {}, forceSuper = true) {
        if (forceSuper) {
            super.reset(options);
        }
        if (options.isServer && isPossiblyServer) {
            this.isServer = true;
            this.server = new ServerSettings(options);
            if (typeof options.email === "object") {
                this.email = new ServerEmailSettings(options.email);
            }
            this.isValidClient = false;
        }
    }
}
//# sourceMappingURL=index.js.map