import type { MongodbSettings } from "../Mongo";
import type { ServerAuthenticationSettings, ServerConfig } from "../server/settings";
import type { ServerEmailSettings } from "../server/settings/email";
import type { Socket } from "socket.io";
import type { Server as HttpServer } from "http";
import type { Server as SecureHttpServer } from "https";
import type { AceBaseBase, Api, DataReference } from "acebase-core";
import * as express from "express";
import type { DebugLogger } from "../lib/DebugLogger";
import type { DatabaseLog } from "../lib/DatabaseLog";
import type { ConnectedClient } from "../lib/ConnectedClient";
import type { DbUserAccountDetails } from "../Schema/user";
import type { SimpleCache } from "../lib/SimpleCache";
import type { PathBasedRules } from "../lib/Rules";
import type { SyncMongoServer } from "..";
import type { DataIndex } from "acebase/dist/types/data-index";
import type { Storage } from "acebase/dist/types/storage";

import type { Request } from "express";

export * from "./email";

export interface KeyValue {
	[key: string]: any;
}

export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;

export type AuthAccessDefault = "deny" | "allow" | "auth";

export type HttpMethod = "get" | "GET" | "put" | "PUT" | "post" | "POST" | "delete" | "DELETE";

export type ServerHttpsSettings = {
	enabled?: boolean;
	keyPath?: string;
	certPath?: string;
	pfxPath?: string;
	passphrase?: string;
} & (
	| { keyPath: string; certPath: string }
	| { pfxPath: string; passphrase: string }
	// eslint-disable-next-line @typescript-eslint/ban-types
	| {}
);

export interface ServerEmailServerSettings {
	host: string;
	port: number;
	username?: string;
	password?: string;
	secure: boolean;
}

export type SyncMongoServerSettings = Partial<{
	host: string;
	port: number;
	maxPayloadSize: string;
	authentication: Partial<ServerAuthenticationSettings>;
	email: ServerEmailSettings;
	mongodb: MongodbSettings;
	rulesFilePath: string;
	cacheSeconds: number;
}>;

export interface RouteInitEnvironment {
	rootPath: string;
	server: HttpServer | SecureHttpServer;
	app: HttpApp;
	router: HttpRouter;
	config: ServerConfig;
	db: AceBaseBase & { api: Api };
	authDb: AceBaseBase;
	debug: DebugLogger;
	securityRef: DataReference;
	authRef: DataReference;
	log: DatabaseLog; // logRef: DataReference;
	tokenSalt: string;
	clients: Map<string, ConnectedClient>;
	authCache: SimpleCache<string, DbUserAccountDetails>;
	//authProviders: { [providerName: string]: OAuth2Provider };
	rules: PathBasedRules;
	instance: SyncMongoServer;
}

export interface RouteRequestEnvironment {
	/** If the request has an Authentication: bearer token, the user will be bound to the incoming request */
	user?: DbUserAccountDetails;

	/** If context is sent through AceBase-Context header, it will be bound to the incoming request */
	context: { [key: string]: any };
}

export type RouteRequest<ReqQuery = any, ReqBody = any, ResBody = any> = Request<any, ResBody, ReqBody, ReqQuery> & RouteRequestEnvironment;

export interface CreateIndexOptions {
	rebuild?: boolean;

	/**
	 * special index to create: 'array', 'fulltext' or 'geo'
	 */
	type?: "normal" | "array" | "fulltext" | "geo";

	/**
	 * keys to include with the indexed values. Can be used to speed up results sorting and
	 * to quickly apply additional filters.
	 */
	include?: string[];

	/**
	 * Specifies whether texts should be indexed using case sensitivity. Setting this to `true`
	 * will cause words with mixed casings (eg "word", "Word" and "WORD") to be indexed separately.
	 * Default is `false`
	 * @default false
	 */
	caseSensitive?: boolean;

	/**
	 * Specifies the default locale of indexed texts. Used to convert indexed strings
	 * to lowercase if `caseSensitive` is set to `true`.
	 * Should be a 2-character language code such as "en" for English and "nl" for Dutch,
	 * or an LCID string for country specific locales such as "en-us" for American English,
	 * "en-gb" for British English, etc
	 */
	textLocale?: string;

	/**
	 * Specifies a key in the source data that contains the locale to use
	 * instead of the default specified in `textLocale`
	 */
	textLocaleKey?: string;

	/**
	 * additional index-specific configuration settings
	 */
	config?: any;
}

export interface IndexesContext {
	storage: Storage;
	debug: DebugLogger;
	indexes: DataIndex[];
}

export interface AceBaseEmailRequest {
	/** email request type */
	type: string;
}

export interface AceBaseUserEmailRequest extends AceBaseEmailRequest {
	user: { uid: string; email: string; username?: string; displayName?: string; settings?: any };
	ip: string;
	date: Date;
}

export interface AceBaseUserSignupEmailRequest extends AceBaseUserEmailRequest {
	type: "user_signup";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface AceBaseUserSignInEmailRequest extends AceBaseUserEmailRequest {
	type: "user_signin";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface AceBaseUserResetPasswordEmailRequest extends AceBaseUserEmailRequest {
	type: "user_reset_password";
	resetCode: string;
}

export interface AceBaseUserResetPasswordSuccessEmailRequest extends AceBaseUserEmailRequest {
	type: "user_reset_password_success";
}
