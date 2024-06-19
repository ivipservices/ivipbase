import { DataBase as DataBaseCore, DataBaseSettings, DebugLogger } from "ivipbase-core";
import { IvipBaseApp, getApp, getFirstApp, getAppsName } from "../app";
import { StorageDBServer } from "./StorageDBServer";
import { StorageDBClient } from "./StorageDBClient";
import { Subscriptions } from "./Subscriptions";
import { PathBasedRules, PathRuleFunction, PathRuleType, RulesData } from "./services/rules";
import { joinObjects } from "../utils";

export class DataBase extends DataBaseCore {
	readonly name: string;
	readonly description: string;

	readonly subscriptions: Subscriptions;
	readonly debug: DebugLogger;
	readonly storage: StorageDBServer | StorageDBClient;

	private _rules: PathBasedRules;

	constructor(readonly database: string, readonly app: IvipBaseApp, options?: Partial<DataBaseSettings>) {
		super(database, options);

		this.name = database;
		this.description =
			(
				(Array.isArray(app.settings.database) ? app.settings.database : [app.settings.database]).find(({ name }) => {
					return name === database;
				}) ?? {
					name: database,
					description: app.settings.description ?? "iVipBase database",
				}
			).description ?? "iVipBase database";

		this.debug = new DebugLogger(app.settings.logLevel, `[${database}]`);

		this.subscriptions = new Subscriptions(database, app);

		const dbInfo = (Array.isArray(this.app.settings.database) ? this.app.settings.database : [this.app.settings.database]).find((d) => d.name === this.name);

		const defaultRules = this.app.settings?.defaultRules ?? { rules: {} };
		const mainRules: RulesData = this.app.settings?.server?.defineRules ?? { rules: {} };
		const dbRules: RulesData = dbInfo?.defineRules ?? { rules: {} };

		this._rules = new PathBasedRules(this.app.settings?.server?.auth.defaultAccessRule ?? "allow", {
			debug: this.debug,
			db: this,
			authEnabled: dbInfo?.authentication?.enabled ?? this.app.settings?.server?.auth.enabled ?? false,
			rules: joinObjects({ rules: {} }, defaultRules.rules, mainRules.rules, dbRules.rules),
		});

		this.storage = app.isServer || !app.settings.isValidClient ? new StorageDBServer(this) : new StorageDBClient(this);

		app.storage.on("add", (e: { dbName: string; name: string; path: string; value: any }) => {
			//console.log(e);
			if (e.dbName !== database) {
				return;
			}
			this.subscriptions.triggerAllEvents(e.path, null, e.value);
		});

		app.storage.on("change", (e: { dbName: string; name: string; path: string; value: any; previous: any }) => {
			//console.log(e);
			if (e.dbName !== database) {
				return;
			}
			this.subscriptions.triggerAllEvents(e.path, e.previous, e.value);
		});

		app.storage.on("remove", (e: { dbName: string; name: string; path: string; value: any }) => {
			if (e.dbName !== database) {
				return;
			}
			this.subscriptions.triggerAllEvents(e.path, e.value, null);
		});

		app.storage.ready(() => {
			this.emit("ready");
			this.subscriptions.initialize();
		});
	}

	get accessToken() {
		return this.app.auth.get(this.name)?.currentUser?.accessToken;
	}

	get rules() {
		return this._rules;
	}

	public connect(retry = true) {
		if (this.storage instanceof StorageDBClient) {
			return this.storage.connect(retry);
		}
		throw new Error("Method not implemented");
	}

	public disconnect() {
		if (this.storage instanceof StorageDBClient) {
			return this.storage.disconnect();
		}
		throw new Error("Method not implemented");
	}

	public async getInfo() {
		return await this.storage.getInfo();
	}

	public async getPerformance() {
		const { data } = await this.storage.getInfo();
		return data ?? [];
	}

	public applyRules(rules: RulesData) {
		return this._rules.applyRules(rules);
	}

	public setRule(rulePaths: string | string[], ruleTypes: PathRuleType | PathRuleType[], callback: PathRuleFunction) {
		return this._rules.add(rulePaths, ruleTypes, callback);
	}
}

export function getDatabase(): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(database: string): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined): DataBase;
export function getDatabase(database: string, app: string | IvipBaseApp | undefined, options: Partial<DataBaseSettings>): DataBase;
export function getDatabase(...args: any[]) {
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

	if (app.databases.has(dbName)) {
		return app.databases.get(dbName);
	}

	const db = new DataBase(
		dbName,
		app,
		args.find((s) => typeof s === "object" && !(s instanceof IvipBaseApp)),
	);

	app.databases.set(dbName, db);
	return db;
}

export function getDatabasesNames(): string[] {
	return Array.prototype.concat
		.apply(
			[],
			getAppsName().map((name) => {
				const names = getApp(name).settings.dbname;
				return Array.isArray(names) ? names : [names];
			}),
		)
		.filter((v, i, a) => a.indexOf(v) === i);
}

export function hasDatabase(database: string): boolean {
	return getDatabasesNames().includes(database);
}

export class SchemaValidationError extends Error {
	constructor(public reason: string) {
		super(`Schema validation failed: ${reason}`);
	}
}
