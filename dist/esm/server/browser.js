import { DebugLogger, SimpleEventEmitter } from "ivipbase-core";
import { getDatabase } from "../database/index.js";
export class ServerNotReadyError extends Error {
    constructor() {
        super("O servidor ainda não está pronto");
    }
}
export class ExternalServerError extends Error {
    constructor() {
        super("Este método não está disponível com um servidor externo");
    }
}
export const AUTH_ACCESS_DEFAULT = {
    DENY_ALL: "deny",
    ALLOW_ALL: "allow",
    ALLOW_AUTHENTICATED: "auth",
};
export class ServerAuthenticationSettings {
    constructor(settings = {}) {
        /**
         * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
         */
        this.enabled = true;
        /**
         * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
         */
        this.allowUserSignup = false;
        /**
         * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
         */
        this.newUserRateLimit = 0;
        /**
         * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração. (não implementado ainda)
         */
        this.tokensExpire = 0;
        /**
         * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
         */
        this.defaultAccessRule = AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;
        /**
         * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
         */
        this.separateDb = false;
        if (typeof settings !== "object") {
            settings = {};
        }
        if (typeof settings.enabled === "boolean") {
            this.enabled = settings.enabled;
        }
        if (typeof settings.allowUserSignup === "boolean") {
            this.allowUserSignup = settings.allowUserSignup;
        }
        if (typeof settings.newUserRateLimit === "number") {
            this.newUserRateLimit = settings.newUserRateLimit;
        }
        if (typeof settings.tokensExpire === "number") {
            this.tokensExpire = settings.tokensExpire;
        }
        if (typeof settings.defaultAccessRule === "string") {
            this.defaultAccessRule = settings.defaultAccessRule;
        }
        if (typeof settings.defaultAdminPassword === "string") {
            this.defaultAdminPassword = settings.defaultAdminPassword;
        }
        if (typeof settings.seperateDb === "boolean") {
            this.separateDb = settings.seperateDb;
        } // Lidar com a grafia anterior _errada_
        if (typeof settings.separateDb === "boolean") {
            this.separateDb = settings.separateDb;
        }
    }
}
export class ServerSettings {
    constructor(options = {}) {
        this.serverName = "IVIPBASE";
        this.logLevel = "log";
        this.host = "localhost";
        this.port = 3000;
        this.rootPath = "";
        this.maxPayloadSize = "10mb";
        this.allowOrigin = "*";
        this.trustProxy = true;
        if (typeof options.serverName === "string") {
            this.serverName = options.serverName;
        }
        if (typeof options.logLevel === "string" && ["verbose", "log", "warn", "error"].includes(options.logLevel)) {
            this.logLevel = options.logLevel;
        }
        if (typeof options.host === "string") {
            this.host = options.host;
        }
        if (typeof options.port === "number") {
            this.port = options.port;
        }
        if (typeof options.maxPayloadSize === "string") {
            this.maxPayloadSize = options.maxPayloadSize;
        }
        if (typeof options.allowOrigin === "string") {
            this.allowOrigin = options.allowOrigin;
        }
        if (typeof options.trustProxy === "boolean") {
            this.trustProxy = options.trustProxy;
        }
        if (typeof options.email === "object") {
            this.email = options.email;
        }
        this.auth = new ServerAuthenticationSettings(options.authentication);
        if (typeof options.init === "function") {
            this.init = options.init;
        }
    }
}
export const isPossiblyServer = false;
export class AbstractLocalServer extends SimpleEventEmitter {
    constructor(appName, settings = {}) {
        super();
        this.appName = appName;
        this._ready = false;
        this.settings = new ServerSettings(settings);
        this.debug = new DebugLogger(this.settings.logLevel, `[${this.settings.serverName}]`);
        this.db = getDatabase(appName);
        this.once("ready", () => {
            this._ready = true;
        });
    }
    /**
     * Aguarda o servidor estar pronto antes de executar o seu callback.
     * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
     * @returns retorna uma promise que resolve quando estiver pronto
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.on("ready", resolve));
        }
        callback?.();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Gets the url the server is running at
     */
    get url() {
        //return `http${this.settings.https.enabled ? 's' : ''}://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
        return `http://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
    }
}
export class LocalServer extends AbstractLocalServer {
    constructor(appName, settings = {}) {
        super(appName, settings);
        this.appName = appName;
        this.isServer = false;
        this.init();
    }
    init() {
        this.emitOnce("ready");
    }
}
//# sourceMappingURL=browser.js.map