import { ID } from "ivipbase-core";
import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo, VALUE_TYPES } from "./MDE";
import sqlite3 from "sqlite3";

export class SqliteSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
	readonly memory: string;

	constructor(options: Partial<SqliteSettings> = {}) {
		super(options);

		this.memory = options.memory ?? ":memory:";
	}
}

interface SqliteRow {
	path: string;
	type: number;
	text_value?: string | null;
	binary_value?: string | null;
	json_value?: string | null;
	created: number;
	modified: number;
	revision_nr: number;
	revision: string;
}

export class SqliteStorage extends CustomStorage {
	private sqlite = sqlite3.verbose();
	private db: sqlite3.Database;
	private pending: { [db: string]: Map<string, SqliteRow> } = {};

	constructor(readonly database: string | string[], options: Partial<SqliteSettings> = {}) {
		super(options);
		this.dbName = "SqliteStorage";
		this.db = new this.sqlite.Database(options.memory ?? ":memory:", sqlite3.OPEN_CREATE | sqlite3.OPEN_READWRITE);
		this.initialize();
	}

	async initialize() {
		try {
			const dbs = (Array.isArray(this.database) ? this.database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i);

			const rows = await this._get(`SELECT name FROM sqlite_master WHERE type='table'`);
			const ignoreDbs = rows.map((row: { name: string }) => {
				return row.name;
			});

			for (const db of dbs) {
				if (ignoreDbs.includes(db)) {
					this.pending[db] = new Map();
					continue;
				}

				await this._exec(`CREATE TABLE ${db} (
                    path TEXT PRIMARY KEY,
                    type INTEGER NOT NULL,  -- node type (1=object, 2=array, 5=string, 8=binary, 9=reference)
                    text_value TEXT,        -- when type is string or reference (> max inline value length?)
                    binary_value BLOB,      -- when type is binary
                    json_value TEXT,        -- when type is object, only simple/small value children are here (no objects, arrays, large strings)
                    
                    created INTEGER NOT NULL,       -- creation timestamp
                    modified INTEGER NOT NULL,      -- modification timestamp
                    revision_nr INTEGER NOT NULL,   -- nr of times the node's value was updated
                    revision TEXT NOT NULL          -- revision id that is shared with all nested nodes that were updated at the same time, should be time sortable so could be considered as a "transaction timestamp"
                )`);

				const rows = [
					{
						path: this.settings.prefix,
						type: VALUE_TYPES.OBJECT,
						json_value: "{}",
						created: Date.now(),
						modified: Date.now(),
						revision_nr: 0,
						revision: ID.generate(),
					},
				];

				const promises = rows.map(async (row: any) => {
					const keys = Object.keys(row);
					const sql = `INSERT INTO ${db} (${keys.join(",")}) VALUES (${keys.map((key) => "$" + key).join(",")})`;
					const params = keys.reduce((obj: any, key: string | number) => {
						obj["$" + key] = row[key];
						return obj;
					}, {} as any);
					await this._exec(sql, params);
				});

				await Promise.all(promises);

				this.pending[db] = new Map();
			}

			this.emit("ready");
		} catch (err) {
			this.emit("error", err);
		}
	}

	private _get(sql: string, params?: any): Promise<any[]> {
		const stack = new Error("").stack;
		return new Promise<any[]>((resolve, reject) => {
			this.db.all(sql, params || {}, (err: any, rows: any[]) => {
				if (err) {
					err.stack = stack;
					err.statement = sql;
					err.params = params;
					return reject(err);
				}
				resolve(rows);
			});
		});
	}

	private _getOne(sql: string, params?: any): Promise<any> {
		const stack = new Error("").stack;
		return new Promise<any>((resolve, reject) => {
			this.db.get(sql, params || {}, (err: any, row: any) => {
				if (err) {
					err.stack = stack;
					err.statement = sql;
					err.params = params;
					return reject(err);
				}
				resolve(row);
			});
		});
	}

	private _exec(sql: string, params?: any): Promise<SqliteStorage> {
		const stack = new Error("").stack;
		return new Promise<SqliteStorage>((resolve, reject) => {
			this.db.run(sql, params || {}, (err: any) => {
				if (err) {
					err.stack = stack;
					err.statement = sql;
					err.params = params;
					return reject(err);
				}
				resolve(this);
			});
		});
	}

	private async _getByRegex(table: string, param: string, expression: RegExp): Promise<any[]> {
		const sql = `SELECT path, type, text_value, json_value, revision, revision_nr, created, modified FROM ${table}`;
		const rows = await this._get(sql);
		const list = rows.filter((row) => param in row && expression.test(row[param]));
		const promises = list.map(async (row: any) => {
			if ([VALUE_TYPES.BINARY].includes(row.type)) {
				return await this._getOne(`SELECT path, binary_value FROM ${table} WHERE path = '${row.path}'`)
					.then(({ binary_value }) => {
						row.binary_value = binary_value;
						return Promise.resolve(row);
					})
					.catch((err) => {
						return Promise.resolve(row);
					});
			}

			return Promise.resolve(row);
		});

		return await Promise.all(promises);
	}

	async getMultiple(database: string, expression: RegExp): Promise<StorageNodeInfo[]> {
		if (!(database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		const pendingList: any[] = Array.from(this.pending[database].values()).filter((row) => expression.test(row.path));

		const list = await this._getByRegex(database, "path", expression);

		const result: StorageNodeInfo[] = pendingList
			.concat(list)
			.filter((row, i, l) => {
				return l.findIndex((r) => r.path === row.path) === i;
			})
			.map((row) => {
				let value = null;

				if (row.type === VALUE_TYPES.STRING || row.type === VALUE_TYPES.REFERENCE) {
					value = row.text_value;
				} else if (row.type === VALUE_TYPES.BINARY) {
					value = row.binary_value;
				} else if (row.type === VALUE_TYPES.OBJECT || row.type === VALUE_TYPES.ARRAY) {
					value = JSON.parse(row.json_value) ?? {};
				}

				return {
					path: row.path,
					content: {
						type: row.type,
						value,
						revision: row.revision,
						revision_nr: row.revision_nr,
						created: row.created,
						modified: row.modified,
					},
				};
			});

		return result;
	}

	async setNode(database: string, path: string, content: StorageNode) {
		if (!(database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		if (content.type === VALUE_TYPES.EMPTY || content.value === null || content.value === undefined) {
			return;
		}

		const sql = `
            INSERT INTO ${database} (path, type, text_value, binary_value, json_value, revision, revision_nr, created, modified)
            VALUES ($path, $type, $text_value, $binary_value, $json_value, $revision, $revision_nr, $created, $modified)
            ON CONFLICT(path) DO UPDATE SET
                type = $type,
                text_value = $text_value,
                binary_value = $binary_value,
                json_value = $json_value,
                revision = $revision,
                revision_nr = $revision_nr,
                created = $created,
                modified = $modified
        `;

		const params = {
			$path: path,
			$type: content.type,
			$text_value: content.type === VALUE_TYPES.STRING || content.type === VALUE_TYPES.REFERENCE ? (content.value as string) : null,
			$binary_value: content.type === VALUE_TYPES.BINARY ? (content.value as string) : null,
			$json_value: content.type === VALUE_TYPES.OBJECT || content.type === VALUE_TYPES.ARRAY ? JSON.stringify(content.value) : null,
			$revision: content.revision,
			$revision_nr: content.revision_nr,
			$created: content.created,
			$modified: content.modified,
		};

		this.pending[database].set(path, {
			path,
			type: content.type,
			text_value: params.$text_value,
			binary_value: params.$binary_value,
			json_value: params.$json_value,
			created: params.$created,
			modified: params.$modified,
			revision_nr: params.$revision_nr,
			revision: params.$revision,
		});

		this._exec(sql, params).finally(() => {
			this.pending[database].delete(path);
		});
	}

	async removeNode(database: string, path: string) {
		if (!(database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		if (path === "") {
			return;
		}

		if (this.pending[database].has(path)) {
			this.pending[database].delete(path);
		}

		const sql = `DELETE FROM ${database} WHERE path = '${path}' OR path LIKE '${path}/%' OR path LIKE '${path}[%'`;
		await this._exec(sql);
	}
}
