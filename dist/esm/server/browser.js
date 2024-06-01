import { DebugLogger, SimpleEventEmitter } from "ivipbase-core";
import { getDatabase, getDatabasesNames, hasDatabase } from "../database/index.js";
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
export class DataBaseServerTransactionSettings {
    constructor(settings) {
        /**
         * Se deve ativar o log de transações
         */
        this.log = false;
        /**
         * Idade máxima em dias para manter as transações no arquivo de log
         */
        this.maxAge = 30;
        /**
         * Se as operações de gravação do banco de dados não devem esperar até que a transação seja registrada
         */
        this.noWait = false;
        if (typeof settings !== "object") {
            return;
        }
        if (typeof settings.log === "boolean") {
            this.log = settings.log;
        }
        if (typeof settings.maxAge === "number") {
            this.maxAge = settings.maxAge;
        }
        if (typeof settings.noWait === "boolean") {
            this.noWait = settings.noWait;
        }
    }
}
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
         * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
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
        this.logLevel = "log";
        this.host = "localhost";
        this.port = 3000;
        this.rootPath = "";
        this.maxPayloadSize = "10mb";
        this.allowOrigin = "*";
        this.trustProxy = true;
        this.serverVersion = "1.0.0";
        this.localPath = "./data";
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
        this.auth = new ServerAuthenticationSettings(options.authentication ?? options.auth ?? {});
        if (typeof options.init === "function") {
            this.init = options.init;
        }
        if (typeof options.serverVersion === "string") {
            this.serverVersion = options.serverVersion;
        }
        this.transactions = new DataBaseServerTransactionSettings(options.transactions ?? {});
        if (typeof options.defineRules === "object") {
            this.defineRules = options.defineRules;
        }
        if (typeof options.localPath === "string") {
            this.localPath = options.localPath;
        }
    }
}
export const isPossiblyServer = false;
export class AbstractLocalServer extends SimpleEventEmitter {
    constructor(localApp, settings = {}) {
        super();
        this.localApp = localApp;
        this._ready = false;
        this.securityRef = (dbName) => {
            return this.db(dbName).ref("__auth__/security");
        };
        this.authRef = (dbName) => {
            return this.db(dbName).ref("__auth__/accounts");
        };
        this.send_email = (dbName, request) => {
            return new Promise((resolve, reject) => {
                try {
                    if (!this.hasDatabase(dbName)) {
                        throw new Error(`Database '${dbName}' not found`);
                    }
                    const send_email = this.db(dbName).app.settings.email;
                    if (!send_email || !send_email.send) {
                        throw new Error("Email not configured");
                    }
                    send_email.send(request).then(resolve);
                }
                catch (e) {
                    reject(e);
                }
            });
        };
        this.settings = new ServerSettings(settings);
        this.db = (dbName) => getDatabase(dbName, localApp);
        this.hasDatabase = (dbName) => hasDatabase(dbName);
        this.rules = (dbName) => {
            return this.db(dbName).rules;
        };
        this.debug = new DebugLogger(this.settings.logLevel, `[SERVER]`);
        this.log = this.debug;
        this.on("ready", () => {
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
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback?.();
    }
    get isReady() {
        return this._ready;
    }
    /**
     * Obtém a URL na qual o servidor está sendo executado
     */
    get url() {
        //return `http${this.settings.https.enabled ? 's' : ''}://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`;
        return `http://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`.replace(/\/+$/gi, "");
    }
    get dbNames() {
        return getDatabasesNames();
    }
    /**
     * Redefine a senha do usuário. Isso também pode ser feito usando o ponto de extremidade da API auth/reset_password
     * @param clientIp endereço IP do usuário
     * @param code código de redefinição que foi enviado para o endereço de e-mail do usuário
     * @param newPassword nova senha escolhida pelo usuário
     */
    resetPassword(dbName, clientIp, code, newPassword) {
        throw new ServerNotReadyError();
    }
    /**
     * Marca o endereço de e-mail da conta do usuário como validado. Isso também pode ser feito usando o ponto de extremidade da API auth/verify_email
     * @param clientIp endereço IP do usuário
     * @param code código de verificação enviado para o endereço de e-mail do usuário
     */
    verifyEmailAddress(dbName, clientIp, code) {
        throw new ServerNotReadyError();
    }
}
export class LocalServer extends AbstractLocalServer {
    constructor(localApp, settings = {}) {
        super(localApp, settings);
        this.isServer = false;
        this.init();
    }
    init() {
        this.emit("ready");
    }
}
//# sourceMappingURL=browser.js.map