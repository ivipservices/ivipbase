import { DataBase, DebugLogger, SimpleEventEmitter } from "ivipbase-core";
import { getDatabase, hasDatabase } from "../database";
import type { IvipBaseApp } from "../app";
import { PathBasedRules } from "./services/rules";

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

export type AuthAccessDefault = "deny" | "allow" | "auth";
export const AUTH_ACCESS_DEFAULT: { [key: string]: AuthAccessDefault } = {
	DENY_ALL: "deny",
	ALLOW_ALL: "allow",
	ALLOW_AUTHENTICATED: "auth",
};

export class DataBaseServerTransactionSettings {
	/**
	 * Se deve ativar o log de transações
	 */
	log = false;

	/**
	 * Idade máxima em dias para manter as transações no arquivo de log
	 */
	maxAge = 30;

	/**
	 * Se as operações de gravação do banco de dados não devem esperar até que a transação seja registrada
	 */
	noWait = false;

	constructor(settings: Partial<DataBaseServerTransactionSettings>) {
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
	/**
	 * Se autorização deve ser habilitada. Sem autorização, o banco de dados inteiro pode ser lido e gravado por qualquer pessoa (não recomendado 🤷🏼‍♂️)
	 */
	readonly enabled: boolean = true;

	/**
	 * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
	 */
	readonly allowUserSignup: boolean = false;

	/**
	 * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
	 */
	readonly newUserRateLimit: number = 0;

	/**
	 * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
	 */
	readonly tokensExpire: number = 0;

	/**
	 * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
	 */
	readonly defaultAccessRule: AuthAccessDefault = AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;

	/**
	 * Quando o servidor é executado pela primeira vez, qual senha usar para o usuário administrador. Se não fornecida, uma senha gerada será usada e mostrada UMA VEZ na saída do console.
	 */
	readonly defaultAdminPassword?: string;

	/**
	 * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
	 */
	readonly separateDb: boolean | "v2" = false;

	constructor(settings: Partial<ServerAuthenticationSettings> = {}) {
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
		if (typeof (settings as any).seperateDb === "boolean") {
			this.separateDb = (settings as any).seperateDb;
		} // Lidar com a grafia anterior _errada_
		if (typeof settings.separateDb === "boolean") {
			this.separateDb = settings.separateDb;
		}
	}
}

export type ServerInitialSettings<LocalServer = any> = Partial<{
	/**
	 * Nível de mensagens registradas no console
	 */
	logLevel: "verbose" | "log" | "warn" | "error";

	/**
	 * IP ou nome do host para iniciar o servidor
	 */
	host: string;

	/**
	 * Número da porta em que o servidor estará ouvindo
	 */
	port: number;

	/**
	 * Caminho raiz para as rotas do iVipBase
	 */
	rootPath: string;

	/**
	 * Tamanho máximo permitido para dados enviados, por exemplo, para atualizar nós. O padrão é '10mb'
	 */
	maxPayloadSize: string;

	/**
	 * Valor a ser usado para o cabeçalho CORS Access-Control-Allow-Origin. O padrão é '*'
	 */
	allowOrigin: string;

	/**
	 * Quando atrás de um servidor de proxy confiável, req.ip e req.hostname serão definidos corretamente
	 */
	trustProxy: boolean;

	/**
	 * Configurações que definem se e como a autenticação é utilizada.
	 */
	authentication: Partial<ServerAuthenticationSettings>;

	/**
	 * Função de inicialização que é executada antes do servidor adicionar o middleware 404 e começar a ouvir chamadas recebidas.
	 * Utilize esta função de retorno de chamada para estender o servidor com rotas personalizadas, adicionar regras de validação de dados, aguardar eventos externos, etc.
	 * @param server Instância do `iVipBaseServer`
	 */
	init?: (server: LocalServer) => Promise<void>;

	serverVersion: string;

	/**
	 * Configurações de registro de transações. Aviso: estágio BETA, NÃO use em produção ainda
	 */
	transactions: Partial<DataBaseServerTransactionSettings>;
}>;

export class ServerSettings<LocalServer = any> {
	readonly logLevel: "verbose" | "log" | "warn" | "error" = "log";
	readonly host: string = "localhost";
	readonly port: number = 3000;
	readonly rootPath: string = "";
	readonly maxPayloadSize: string = "10mb";
	readonly allowOrigin: string = "*";
	readonly trustProxy: boolean = true;
	readonly auth: ServerAuthenticationSettings;
	readonly init?: (server: LocalServer) => Promise<void>;
	readonly serverVersion: string = "1.0.0";
	readonly transactions: DataBaseServerTransactionSettings;

	constructor(options: ServerInitialSettings<LocalServer> = {}) {
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

		this.auth = new ServerAuthenticationSettings(options.authentication);

		if (typeof options.init === "function") {
			this.init = options.init;
		}

		if (typeof options.serverVersion === "string") {
			this.serverVersion = options.serverVersion;
		}

		this.transactions = new DataBaseServerTransactionSettings(options.transactions ?? {});
	}
}

export const isPossiblyServer = false;

export abstract class AbstractLocalServer<LocalServer = any> extends SimpleEventEmitter {
	protected _ready = false;
	readonly settings: ServerSettings<LocalServer>;
	readonly debug: DebugLogger;
	readonly db: (dbName: string) => DataBase;
	readonly hasDatabase: (dbName: string) => boolean;
	readonly rules: (dbName: string) => PathBasedRules;
	private rules_db: Map<string, PathBasedRules> = new Map();

	constructor(readonly localApp: IvipBaseApp, settings: Partial<ServerSettings> = {}) {
		super();
		this.settings = new ServerSettings<LocalServer>(settings);
		this.db = (dbName) => getDatabase(dbName, localApp);
		this.hasDatabase = (dbName) => hasDatabase(dbName);
		this.rules = (dbName) => {
			if (this.rules_db.has(dbName)) {
				return this.rules_db.get(dbName)!;
			}

			const db = this.db(dbName);

			const rules = new PathBasedRules(this.settings.auth.defaultAccessRule, {
				debug: this.debug,
				db,
				authEnabled: this.settings.auth.enabled,
			});

			this.rules_db.set(dbName, rules);
			return rules;
		};
		this.debug = new DebugLogger(this.settings.logLevel, `[${this.db.name}]`);

		this.once("ready", () => {
			this._ready = true;
		});
	}

	abstract init(): void;

	/**
	 * Aguarda o servidor estar pronto antes de executar o seu callback.
	 * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
	 * @returns retorna uma promise que resolve quando estiver pronto
	 */
	async ready(callback?: () => void) {
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
		return `http://${this.settings.host}:${this.settings.port}/${this.settings.rootPath}`.replace(/\/+$/gi, "");
	}
}

export class LocalServer extends AbstractLocalServer<LocalServer> {
	readonly isServer: boolean = false;

	constructor(localApp: IvipBaseApp, settings: Partial<ServerSettings> = {}) {
		super(localApp, settings);
		this.init();
	}

	init() {
		this.emitOnce("ready");
	}
}
