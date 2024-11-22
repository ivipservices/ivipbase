import type { RulesData } from "../../database/services/rules";
import { isPossiblyServer } from "../../server";
import { ServerAuthenticationSettings } from "../../server/browser";
import { DEFAULT_ENTRY_NAME } from "../internal";
import { StorageSettings, validSettings } from "../verifyStorage";

const hostnameRegex = /^((https?):\/\/)?(localhost|([\da-z\.-]+\.[a-z\.]{2,6}|[\d\.]+))(\:{1}(\d+))?$/;

export interface DatabaseSettings {
	name: string;
	title?: string;
	description?: string;
	defineRules?: RulesData;
	authentication?: Partial<ServerAuthenticationSettings>;
}

export interface IvipBaseSettingsBrowser {
	name?: string;
	dbname: string | string[];
	logLevel?: "log" | "warn" | "error";
	protocol?: "http" | "https";
	host?: string;
	port: number | undefined;
	storage: StorageSettings | undefined;
}

export interface IvipBaseSettingsServer {
	protocol?: "http" | "https";
	host: string;
	port: number;
	localPath: string;
	name?: string;
	logLevel?: "log" | "warn" | "error";
	storage: StorageSettings | undefined;
	maxPayloadSize?: string;
	allowOrigin?: string;
	trustProxy?: boolean;
	authentication?: {
		allowUserSignup?: boolean;
		newUserRateLimit?: number;
		tokensExpire?: number;
		defaultAccessRule?: "deny" | "allow" | "auth";
		defaultAdminPassword?: string;
	};
	defineRules?: RulesData;
}

export type IvipBaseSettingsOptions = (IvipBaseSettingsBrowser & { isServer: false }) | (IvipBaseSettingsServer & { isServer: true });

const randomPassword = (length = 24) => {
	const chars = "abcdefghijklmnopqrstuvwxyzABCDEFGHIJKLMNOPQRSTUVWXYZ0123456789";
	return Array.from({ length }, () => chars[Math.floor(Math.random() * chars.length)]).join("");
};

const passwordDefault = randomPassword();

type BrowserOptions = Required<
	Omit<IvipBaseSettingsBrowser, "dbname"> & {
		isConnectionDefined: boolean;
		dbname: string[];
	}
>;

type ServerOptions = Required<
	IvipBaseSettingsServer & {
		isConnectionDefined: boolean;
		databaseNames: string[];
		bootable: boolean;
	}
>;

export class IvipBaseSettings {
	private _browserOptions: BrowserOptions | undefined;
	private _serverOptions: ServerOptions | undefined;

	constructor(public options: Partial<IvipBaseSettingsOptions> = {}) {
		this.reset(options);
	}

	get isServer() {
		return this.options?.isServer && isPossiblyServer;
	}

	get browserOptions() {
		if (this.options.isServer) return;

		if (this._browserOptions) {
			return this._browserOptions;
		}

		const options: BrowserOptions = {
			name: DEFAULT_ENTRY_NAME,
			dbname: ["root"],
			logLevel: "log",
			storage: undefined,
			protocol: "http",
			host: "localhost",
			port: undefined,
			isConnectionDefined: false,
		};

		options.name = this.options.name ?? options.name;
		const dbname = (this.options as IvipBaseSettingsBrowser).dbname;
		options.dbname = typeof dbname === "string" ? [dbname] : dbname ?? options.dbname;

		options.logLevel = this.options.logLevel ?? options.logLevel;

		if (validSettings(this.options.storage)) {
			options.storage = this.options.storage;
		}

		const [_, _protocol, protocol, host, _host, _port, port] = (typeof this.options.host === "string" ? this.options.host : "").match(hostnameRegex) ?? [];

		options.isConnectionDefined = !!host;

		options.protocol = ["https", "http"].includes(protocol) ? (protocol as any) : this.options.protocol === "https" ? "https" : "http";
		options.host = host ?? "localhost";
		options.port = port ? parseInt(port) : this.options.port ?? options.port;

		this._browserOptions = options;
		return options;
	}

	get serverOptions() {
		if (!this.options.isServer) return;

		if (this._serverOptions) {
			return this._serverOptions;
		}

		const options: ServerOptions = {
			protocol: "http",
			host: "localhost",
			port: 8080,
			localPath: "",
			name: DEFAULT_ENTRY_NAME,
			logLevel: "log",
			storage: undefined,
			maxPayloadSize: "30mb",
			allowOrigin: "*",
			trustProxy: false,
			authentication: {
				allowUserSignup: true,
				newUserRateLimit: 5000,
				tokensExpire: 86400,
				defaultAccessRule: "auth",
				defaultAdminPassword: passwordDefault,
			},
			defineRules: { rules: {} },
			isConnectionDefined: false,
			databaseNames: [],
			bootable: true,
		};

		options.name = this.options.name ?? options.name;
		options.localPath = (this.options as IvipBaseSettingsServer).localPath ?? options.localPath;

		const [_, _protocol, protocol, host, _host, _port, port] = (typeof this.options.host === "string" ? this.options.host : "").match(hostnameRegex) ?? [];

		options.isConnectionDefined = !!host;

		options.protocol = ["https", "http"].includes(protocol) ? (protocol as any) : this.options.protocol === "https" ? "https" : "http";
		options.host = host ?? "localhost";
		options.port = port ? parseInt(port) : this.options.port ?? options.port;

		if (validSettings(this.options.storage)) {
			options.storage = this.options.storage;
		}

		options.maxPayloadSize = (this.options as IvipBaseSettingsServer).maxPayloadSize ?? options.maxPayloadSize;
		options.allowOrigin = (this.options as IvipBaseSettingsServer).allowOrigin ?? options.allowOrigin;
		options.trustProxy = (this.options as IvipBaseSettingsServer).trustProxy ?? options.trustProxy;

		const authentication = (this.options as IvipBaseSettingsServer).authentication;

		if (typeof authentication === "object") {
			options.authentication = {
				allowUserSignup: authentication.allowUserSignup ?? options.authentication.allowUserSignup,
				newUserRateLimit: authentication.newUserRateLimit ?? options.authentication.newUserRateLimit,
				tokensExpire: authentication.tokensExpire ?? options.authentication.tokensExpire,
				defaultAccessRule: authentication.defaultAccessRule ?? options.authentication.defaultAccessRule,
				defaultAdminPassword: authentication.defaultAdminPassword ?? options.authentication.defaultAdminPassword,
			};
		}

		options.defineRules = (this.options as IvipBaseSettingsServer).defineRules ?? options.defineRules;

		this._serverOptions = options;
		return options;
	}

	get definitions(): BrowserOptions | ServerOptions {
		return (this.options.isServer ? this.serverOptions : this.browserOptions)!!;
	}

	get isPossiplyServer() {
		return false;
	}

	get databaseNames() {
		return "dbname" in this.definitions ? this.definitions.dbname : [];
	}

	get bootable() {
		return "bootable" in this.definitions ? this.definitions.bootable : true;
	}

	get storage() {
		return this.definitions.storage;
	}

	reset(options: Partial<IvipBaseSettingsOptions> = {}) {
		this._browserOptions = undefined;
		this._serverOptions = undefined;
		this.options = options;
	}
}
