import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app";
import { hasDatabase } from "../database";

export class AuthUser {
	/**
	 * unique id
	 */
	uid: string;

	/**
	 * username used for signing in
	 */
	username?: string;

	/**
	 * email address used for signing in
	 */
	email?: string;

	/**
	 * display or screen name
	 */
	displayName: string;

	/**
	 * User profile picture
	 */
	picture?: { width: number; height: number; url: string };

	/**
	 * Whether the user's email address has been verified
	 */
	emailVerified = false;

	/**
	 * Date/time this user record was created (ISO date string)
	 */
	created: string;

	/**
	 * Date/time this user previously signed in (ISO date string)
	 */
	prevSignin?: string;

	/**
	 * IP address of previous signin
	 */
	prevSigninIp?: string;

	/**
	 * Date/time this user last signed in (ISO date string)
	 */
	lastSignin?: string;

	/**
	 * IP address of last signin
	 */
	lastSigninIp?: string;

	/**
	 * Whether the user has to change their password
	 */
	changePassword = false;

	/**
	 * If `changePassword` is true, date/time the password change was requested (ISO date string)
	 */
	changePasswordRequested?: string;

	/**
	 * If `changePassword` is true, date/time the password must have been changed (ISO date string)
	 */
	changePasswordBefore?: string;

	/**
	 * Additional saved user settings & info
	 */
	settings: { [key: string]: string | number | boolean };

	constructor(user: Partial<AuthUser>) {
		Object.assign(this, user);
		if (!user.uid) {
			throw new Error("User details is missing required uid field");
		}
		this.uid = user.uid;
		this.displayName = user.displayName ?? "unknown";
		this.created = user.created ?? new Date(0).toISOString();
		this.settings = user.settings ?? {};
	}
}

export class Auth {
	readonly isValidAuth: boolean;

	/**
	 * Currently signed in user
	 */
	public user: AuthUser | null = null;

	/**
	 * Access token of currently signed in user
	 */
	public accessToken: string | null = null;

	constructor(readonly database: string, readonly app: IvipBaseApp) {
		this.isValidAuth = app.isServer || !app.settings.isValidClient ? false : true;
	}
}

export function getAuth(): Auth;
export function getAuth(app: string | IvipBaseApp | undefined): Auth;
export function getAuth(database: string): Auth;
export function getAuth(database: string, app: string | IvipBaseApp | undefined): Auth;
export function getAuth(...args: any[]) {
	let app: IvipBaseApp = args.find((a) => a instanceof IvipBaseApp),
		dbName: string | undefined;
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	let database: string | string[] = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);

	if (typeof database !== "string") {
		database = app.settings.dbname;
	}

	dbName = (Array.isArray(database) ? database : [database])[0];

	if (!hasDatabase(dbName)) {
		throw new Error(`Database "${dbName}" does not exist`);
	}

	if (dbName && app.auth.has(dbName)) {
		return app.auth.get(dbName);
	}

	const auth = new Auth((Array.isArray(database) ? database : [database])[0], app);

	app.auth.set(dbName, auth);
	return auth;
}
