import type { RulesData } from "../../database/services/rules";
import { ServerAuthenticationSettings } from "../../server/browser";
import { DEFAULT_ENTRY_NAME } from "../internal";
import { DataStorageSettings, StorageSettings, validSettings } from "../verifyStorage";

class NotImplementedError extends Error {
	constructor(name: string) {
		super(`${name} is not implemented`);
	}
}

export interface EmailRequestType {
	/** email request type */
	type: "user_signup" | "user_signin" | "user_reset_password" | "user_reset_password_success";
}

export interface UserEmailRequest extends EmailRequestType {
	user: { uid: string; email: string; username?: string; displayName?: string; settings?: any };
	ip: string;
	date: Date;
	database: string;
}

export interface UserSignupEmailRequest extends UserEmailRequest {
	type: "user_signup";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface UserSignInEmailRequest extends UserEmailRequest {
	type: "user_signin";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface UserResetPasswordEmailRequest extends UserEmailRequest {
	type: "user_reset_password";
	resetCode: string;
}

export interface UserResetPasswordSuccessEmailRequest extends UserEmailRequest {
	type: "user_reset_password_success";
}

export type EmailRequest = UserSignupEmailRequest | UserSignInEmailRequest | UserResetPasswordEmailRequest | UserResetPasswordSuccessEmailRequest;

export interface ServerEmailServerSettings {
	/** É o nome do host ou endereço IP ao qual se conectar (o padrão é ‘localhost’) */
	host: string;

	/** É a porta à qual se conectar (o padrão é 587 se for seguro for falso ou 465 se for verdadeiro) */
	port: number;

	/** Indica o tipo de autenticação, o padrão é ‘login’, outra opção é ‘oauth2’ */
	type?: "login" | "oauth2";

	/** É o nome de usuário de login */
	user: string;

	/** É a senha do usuário se o login normal for usado */
	pass: string;

	/** Se for verdade, a conexão usará TLS ao conectar-se ao servidor. Se for falso (o padrão), então o TLS será usado se o servidor suportar a extensão STARTTLS. Na maioria dos casos, defina esse valor como verdadeiro se você estiver se conectando à porta 465. Para a porta 587 ou 25, mantenha-o falso */
	secure?: boolean;
}

export interface InitialServerEmailSettings {
	/** Use a propriedade "send" para a sua própria implementação */
	server: ServerEmailServerSettings;

	/** Função opcional para preparar o modelo de e-mail antes do envio. */
	prepareModel?: (request: EmailRequest) =>
		| {
				title: string;
				subject: string;
				message: string;
		  }
		| undefined;
}

export class ServerEmailSettings {
	readonly server: ServerEmailServerSettings;
	readonly prepareModel: (request: EmailRequest) =>
		| {
				title: string;
				subject: string;
				message: string;
		  }
		| undefined = () => ({
		title: "",
		subject: "",
		message: "",
	});

	constructor(options: InitialServerEmailSettings) {
		this.server = options.server;
	}

	/** Função a ser chamada quando um e-mail precisa ser enviado */
	send(request: EmailRequest): Promise<void> {
		throw new NotImplementedError("ServerEmail");
	}
}

const hostnameRegex = /^((https?):\/\/)?(localhost|([\da-z\.-]+\.[a-z\.]{2,6}|[\d\.]+))(\:{1}(\d+))?$/;

export interface DatabaseSettings {
	name: string;
	description?: string;
	defineRules?: RulesData;
	authentication?: Partial<ServerAuthenticationSettings>;
}

export class IvipBaseSettings {
	public name: string = DEFAULT_ENTRY_NAME;

	public dbname: string | string[] = "root";
	public database: DatabaseSettings | DatabaseSettings[] = {
		name: "root",
		description: "iVipBase database",
	};

	public description: string = "";
	public logLevel: "log" | "warn" | "error" = "log";
	public storage?: StorageSettings;

	public protocol: "http" | "https" = "http";
	public host: string = "localhost";
	public port?: number;

	public isServer: boolean = false;
	public isValidClient: boolean = true;
	public isConnectionDefined: boolean = false;
	public bootable: boolean = true;

	public defaultRules: RulesData = { rules: {} };

	constructor(readonly options: Partial<Omit<IvipBaseSettings, "isServer" | "isValidClient">> = {}) {
		this.reset(options);
	}

	get isPossiplyServer() {
		return false;
	}

	reset(options: Partial<Omit<IvipBaseSettings, "isServer" | "isValidClient">> = {}) {
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
			const index = (this.database as DatabaseSettings[]).findIndex((db) => db.name === name);
			if (index === -1) {
				(this.database as DatabaseSettings[]).push({ name, description: `IvipBase database` });
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

		this.isConnectionDefined = !!host;

		this.protocol = ["https", "http"].includes(protocol) ? (protocol as any) : options.protocol === "https" ? "https" : "http";
		this.host = host ?? "localhost";
		this.port = port ? parseInt(port) : options.port;

		this.bootable = options.bootable ?? true;

		this.defaultRules = options.defaultRules ?? { rules: {} };
	}
}
