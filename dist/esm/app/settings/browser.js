import { DEFAULT_ENTRY_NAME } from "../internal.js";
import { DataStorageSettings, validSettings } from "../verifyStorage/index.js";
class NotImplementedError extends Error {
    constructor(name) {
        super(`${name} is not implemented`);
    }
}
export class ServerEmailSettings {
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
const hostnameRegex = /^((https?):\/\/)?(localhost|([\da-z\.-]+\.[a-z\.]{2,6}|[\d\.]+))(\:{1}(\d+))?$/;
export class IvipBaseSettings {
    constructor(options = {}) {
        this.options = options;
        this.name = DEFAULT_ENTRY_NAME;
        this.dbname = "root";
        this.database = {
            name: "root",
            description: "iVipBase database",
        };
        this.description = "";
        this.logLevel = "log";
        this.storage = new DataStorageSettings();
        this.protocol = "http";
        this.host = "localhost";
        this.isServer = false;
        this.isValidClient = true;
        this.bootable = true;
        this.reset(options);
    }
    reset(options = {}) {
        if (typeof options.name === "string") {
            this.name = options.name;
        }
        if (typeof options.dbname === "string" || Array.isArray(options.dbname)) {
            this.dbname = (Array.isArray(options.dbname) ? options.dbname : [options.dbname]).filter((n) => typeof n === "string" && n.trim() !== "");
            this.dbname = this.dbname.length > 0 ? this.dbname : "root";
        }
        if (Array.isArray(options.database) || typeof options.database === "object") {
            this.database = (Array.isArray(options.database) ? options.database : [options.database]).filter((o) => {
                return typeof o === "object" && typeof o.name === "string" && o.name.trim() !== "";
            });
            this.dbname = Array.isArray(this.dbname) ? this.dbname : typeof this.dbname === "string" ? [this.dbname] : [];
            this.dbname = this.dbname.concat(this.database.map(({ name }) => name));
            this.dbname = this.dbname.length > 0 ? this.dbname : "root";
        }
        const databases = Array.isArray(this.dbname) ? this.dbname : [this.dbname];
        this.database = Array.isArray(this.database) ? this.database : [this.database];
        databases.forEach((name) => {
            const index = this.database.findIndex((db) => db.name === name);
            if (index === -1) {
                this.database.push({ name, description: `IvipBase database` });
            }
        });
        this.description = options.description ?? `IvipBase database`;
        if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if (validSettings(options.storage)) {
            this.storage = options.storage;
        }
        const [_, _protocol, protocol, host, _host, _port, port] = (typeof options.host === "string" ? options.host : "").match(hostnameRegex) ?? [];
        this.protocol = ["https", "http"].includes(protocol) ? protocol : options.protocol === "https" ? "https" : "http";
        this.host = host ?? "localhost";
        this.port = port ? parseInt(port) : options.port;
        this.bootable = options.bootable ?? true;
    }
}
//# sourceMappingURL=browser.js.map