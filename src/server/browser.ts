import { DataReference, DebugLogger, SimpleEventEmitter } from "ivipbase-core";
import { DataBase, getDatabase, getDatabasesNames, hasDatabase } from "../database";
import type { IvipBaseApp } from "../app";
import { DbUserAccountDetails } from "./schema/user";
import { DatabaseSettings, EmailRequest } from "../app/settings/browser";
import type { RulesData } from "../database/services/rules";
import { PathBasedRules } from "../database/services/rules";
import { joinObjects } from "../utils";

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
	public enabled: boolean = true;

	/**
	 * Se a criação de novos usuários é permitida para qualquer pessoa ou apenas para o administrador
	 */
	public allowUserSignup: boolean = false;

	/**
	 * Quantos novos usuários podem se inscrever por hora por endereço IP. Não implementado ainda
	 */
	public newUserRateLimit: number = 0;

	/**
	 * Quantos minutos antes dos tokens de acesso expirarem. 0 para sem expiração.
	 */
	public tokensExpire: number = 0;

	/**
	 * Quando o servidor é executado pela primeira vez, quais padrões usar para gerar o arquivo rules.json. Opções são: 'auth' (acesso apenas autenticado ao banco de dados, padrão), 'deny' (negar acesso a qualquer pessoa, exceto o usuário administrador), 'allow' (permitir acesso a qualquer pessoa)
	 */
	public defaultAccessRule: AuthAccessDefault = AUTH_ACCESS_DEFAULT.ALLOW_AUTHENTICATED;

	/**
	 * Quando o servidor é executado pela primeira vez, qual senha usar para o usuário administrador. Se não fornecida, uma senha gerada será usada e mostrada UMA VEZ na saída do console.
	 */
	public defaultAdminPassword?: string;

	/**
	 * Se deve usar um banco de dados separado para autenticação e logs. 'v2' armazenará dados em auth.db, o que AINDA NÃO FOI TESTADO!
	 */
	public separateDb: boolean | "v2" = false;

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

	toJSON() {
		return {
			enabled: this.enabled,
			allowUserSignup: this.allowUserSignup,
			newUserRateLimit: this.newUserRateLimit,
			tokensExpire: this.tokensExpire,
			defaultAccessRule: this.defaultAccessRule,
			defaultAdminPassword: this.defaultAdminPassword,
			separateDb: this.separateDb,
		};
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

	defineRules: RulesData;

	localPath: string;
}>;

export class ServerSettings<LocalServer = any> {
	public logLevel: "verbose" | "log" | "warn" | "error" = "log";
	public host: string = "localhost";
	public port: number = 3000;
	public rootPath: string = "";
	public maxPayloadSize: string = "10mb";
	public allowOrigin: string = "*";
	public trustProxy: boolean = true;
	public auth: ServerAuthenticationSettings;
	public init?: (server: LocalServer) => Promise<void>;
	public serverVersion: string = "1.0.0";
	public transactions: DataBaseServerTransactionSettings;
	public defineRules?: RulesData;
	public localPath: string = "./data";
	public dbAuth: { [dbName: string]: ServerAuthenticationSettings } = {};

	constructor(
		options: Partial<
			ServerInitialSettings<LocalServer> & {
				database: DatabaseSettings | DatabaseSettings[];
			}
		> = {},
	) {
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

		this.auth = new ServerAuthenticationSettings(options.authentication ?? (options as any).auth ?? {});

		const dbList: DatabaseSettings[] = (Array.isArray(options.database) ? options.database : [options.database]).filter((db) => typeof db !== "undefined") as any;

		if (typeof (options as any).dbAuth === "object") {
			this.dbAuth = Object.fromEntries(
				Object.entries((options as any).dbAuth).map(([dbName, auth]) => {
					if (auth instanceof ServerAuthenticationSettings) {
						return [dbName, auth];
					}
					return [dbName, new ServerAuthenticationSettings(joinObjects(this.auth.toJSON(), auth ?? {}))];
				}),
			);
		}

		dbList.forEach((db) => {
			this.dbAuth[db.name] = new ServerAuthenticationSettings(joinObjects(this.auth.toJSON(), db.authentication ?? {}));
		});

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

export abstract class AbstractLocalServer<LocalServer = any> extends SimpleEventEmitter {
	protected _ready = false;
	readonly settings: ServerSettings<LocalServer>;
	readonly log: DebugLogger;
	readonly debug: DebugLogger;
	readonly db: (dbName: string) => DataBase;
	readonly hasDatabase: (dbName: string) => boolean;
	readonly rules: (dbName: string) => PathBasedRules;

	readonly securityRef: (dbName: string) => any = (dbName): DataReference<any> => {
		return this.db(dbName).ref("__auth__/security");
	};

	readonly authRef: (dbName: string) => any = (dbName): DataReference<any> => {
		return this.db(dbName).ref("__auth__/accounts");
	};

	readonly send_email = (dbName: string, request: EmailRequest) => {
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
			} catch (e) {
				reject(e);
			}
		});
	};

	constructor(readonly localApp: IvipBaseApp, settings: Partial<ServerSettings> = {}) {
		super();
		this.settings = new ServerSettings<LocalServer>(settings);
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

	abstract init(): void;

	/**
	 * Aguarda o servidor estar pronto antes de executar o seu callback.
	 * @param callback (opcional) função de retorno chamada quando o servidor estiver pronto para ser usado. Você também pode usar a promise retornada.
	 * @returns retorna uma promise que resolve quando estiver pronto
	 */
	async ready(callback?: () => void) {
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

	get dbNames(): string[] {
		return getDatabasesNames();
	}

	/**
	 * Redefine a senha do usuário. Isso também pode ser feito usando o ponto de extremidade da API auth/reset_password
	 * @param clientIp endereço IP do usuário
	 * @param code código de redefinição que foi enviado para o endereço de e-mail do usuário
	 * @param newPassword nova senha escolhida pelo usuário
	 */
	resetPassword(dbName: string, clientIp: string, code: string, newPassword: string): Promise<DbUserAccountDetails> {
		throw new ServerNotReadyError();
	}

	/**
	 * Marca o endereço de e-mail da conta do usuário como validado. Isso também pode ser feito usando o ponto de extremidade da API auth/verify_email
	 * @param clientIp endereço IP do usuário
	 * @param code código de verificação enviado para o endereço de e-mail do usuário
	 */
	verifyEmailAddress(dbName: string, clientIp: string, code: string): Promise<string> {
		throw new ServerNotReadyError();
	}
}

export class LocalServer extends AbstractLocalServer<LocalServer> {
	readonly isServer: boolean = false;

	constructor(localApp: IvipBaseApp, settings: Partial<ServerSettings> = {}) {
		super(localApp, settings);
		this.init();
	}

	init() {
		this.emit("ready");
	}
}
