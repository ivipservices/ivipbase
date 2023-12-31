import { DEFAULT_ENTRY_NAME } from "../internal";
import { DataStorageSettings, StorageSettings, validSettings } from "../verifyStorage";

class NotImplementedError extends Error {
	constructor(name: string) {
		super(`${name} is not implemented`);
	}
}

export interface EmailRequestType {
	/** email request type */
	type: string;
}

export interface UserEmailRequest extends EmailRequestType {
	user: { uid: string; email: string; username?: string; displayName?: string; settings?: any };
	ip: string;
	date: Date;
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
	prepareModel?: (request: EmailRequest) => {
		title: string;
		subject: string;
		message: string;
	};
}

export class ServerEmailSettings {
	readonly server: ServerEmailServerSettings;
	readonly prepareModel: (request: EmailRequest) => {
		title: string;
		subject: string;
		message: string;
	} = () => ({
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

const hostnameRegex = /^(?:(?:https?|ftp):\/\/)?(?:localhost|(?:[a-zA-Z0-9-]+\.)*[a-zA-Z0-9-]+\.[a-zA-Z]{2,}|(?:\d{1,3}\.){3}\d{1,3})$/;

export class IvipBaseSettings {
	readonly name: string = DEFAULT_ENTRY_NAME;
	readonly dbname: string | string[] = "root";
	readonly logLevel: "log" | "warn" | "error" = "log";
	readonly storage: StorageSettings = new DataStorageSettings();

	readonly host?: string;
	readonly port?: number;

	readonly isServer: boolean = false;
	readonly isValidClient: boolean = false;

	constructor(options: Partial<Omit<IvipBaseSettings, "isServer" | "isValidClient">> = {}) {
		if (typeof options.name === "string") {
			this.name = options.name;
		}

		if (typeof options.dbname === "string" || Array.isArray(options.dbname)) {
			this.dbname = (Array.isArray(options.dbname) ? options.dbname : [options.dbname]).filter((n) => typeof n === "string" && n.trim() !== "");
			this.dbname = this.dbname.length > 0 ? this.dbname : "root";
		}

		if (typeof options.logLevel === "string" && ["log", "warn", "error"].includes(options.logLevel)) {
			this.logLevel = options.logLevel;
		}

		if (validSettings(options.storage)) {
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
