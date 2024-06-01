import { ID } from "ivipbase-core";
import { AppError, ERROR_FACTORY } from "../erros";
import { CustomStorage, CustomStorageSettings } from "./CustomStorage";
import { StorageNode, StorageNodeInfo, VALUE_TYPES } from "./MDE";
import { Sequelize, DataTypes, Op, Options } from "sequelize";

export class SequelizeSettings extends CustomStorageSettings implements Omit<CustomStorageSettings, "getMultiple" | "setNode" | "removeNode"> {
	readonly uri?: string;
	readonly database?: string;
	readonly username?: string;
	readonly password?: string;
	readonly options?: Options;
	readonly sequelize?: Sequelize;

	constructor(options: Partial<SequelizeSettings> = {}) {
		super(options);

		if (typeof options.uri === "string" && options.uri.trim() !== "") {
			this.uri = options.uri;
		}

		if (typeof options.database === "string" && options.database.trim() !== "") {
			this.database = options.database;
		}

		if (typeof options.username === "string" && options.username.trim() !== "") {
			this.username = options.username;
		}

		if (typeof options.password === "string" && options.password.trim() !== "") {
			this.password = options.password;
		}

		this.options = { ...(options.options ?? {}), logging: false };

		if (options.sequelize instanceof Sequelize) {
			this.sequelize = options.sequelize;
		}
	}
}

interface SequelizeRow {
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

export class SequelizeStorage extends CustomStorage {
	private sequelize: Sequelize;
	private pending: { [db: string]: Map<string, SequelizeRow> } = {};

	constructor(readonly database: string | string[], options: Partial<SequelizeSettings> = {}) {
		super(options);
		this.dbName = "SequelizeStorage";

		if (options.sequelize instanceof Sequelize) {
			this.sequelize = options.sequelize;
		} else if (options.database && options.username && options.password) {
			this.sequelize = new Sequelize(options.database, options.username, options.password, options.options);
		} else if (options.database && options.username) {
			this.sequelize = new Sequelize(options.database, options.username, options.options);
		} else if (options.uri) {
			this.sequelize = new Sequelize(options.uri, options.options);
		} else if (options.options) {
			this.sequelize = new Sequelize(options.options);
		} else {
			this.sequelize = new Sequelize({
				dialect: "sqlite",
				storage: ":memory:",
			});
		}

		this.initialize();
	}

	async initialize() {
		try {
			const dbs = (Array.isArray(this.database) ? this.database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i);

			for (const db of dbs) {
				this.pending[db] = new Map();
				this.sequelize.define(db, {
					path: {
						type: DataTypes.TEXT,
						primaryKey: true,
					},
					type: {
						type: DataTypes.INTEGER,
						allowNull: false,
					},
					text_value: DataTypes.TEXT,
					binary_value: DataTypes.BLOB,
					json_value: DataTypes.TEXT,
					created: {
						type: DataTypes.INTEGER,
						allowNull: false,
					},
					modified: {
						type: DataTypes.INTEGER,
						allowNull: false,
					},
					revision_nr: {
						type: DataTypes.INTEGER,
						allowNull: false,
					},
					revision: {
						type: DataTypes.TEXT,
						allowNull: false,
					},
				});
			}

			await this.sequelize.sync();

			for (const db of dbs) {
				const rows = [
					{
						path: this.settings.prefix,
						type: VALUE_TYPES.OBJECT,
						text_value: null,
						binary_value: null,
						json_value: "{}",
						created: Date.now(),
						modified: Date.now(),
						revision_nr: 0,
						revision: ID.generate(),
					},
				];

				for (let row of rows) {
					await this.sequelize.models[db].upsert(row);
				}
			}

			this.emit("ready");
		} catch (err) {
			this.debug.error(`Erro ao inicializar o banco de dados: ${(err as any)?.message ?? String(err)}`);
			this.emit("error", err);
		}
	}

	async getMultiple(database: string, { regex }: { regex: RegExp; query: string[] }, simplifyValues: boolean = false): Promise<StorageNodeInfo[]> {
		if (!(database in this.sequelize.models && database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		try {
			const pendingList: any[] = Array.from(this.pending[database].values()).filter((row) => regex.test(row.path));

			const rows = await this.sequelize.models[database]
				.findAll({
					attributes: ["path", "type", "text_value", "json_value", "revision", "revision_nr", "created", "modified"],
				})
				.then((rows) => {
					return Promise.resolve(rows.filter((row) => "path" in row && typeof row["path"] === "string" && regex.test(row["path"])));
				});

			const list = await Promise.all(
				rows.map(async (row: any) => {
					if ([VALUE_TYPES.BINARY].includes(row.type) && !simplifyValues) {
						return await this.sequelize.models[database]
							.findOne({
								where: {
									path: row.path,
								},
								attributes: ["path", "binary_value"],
							})
							.then((r) => {
								row.binary_value = r ? (r as any).binary_value ?? null : null;
								return Promise.resolve(row);
							})
							.catch((err) => {
								return Promise.resolve(row);
							});
					}
					return Promise.resolve(row);
				}),
			);

			const result: StorageNodeInfo[] = pendingList
				.concat(list)
				.filter((row, i, l) => {
					return l.findIndex((r) => r.path === row.path) === i;
				})
				.map((row) => {
					let value = null;

					if (row.type === VALUE_TYPES.STRING || row.type === VALUE_TYPES.REFERENCE) {
						value = row.text_value ?? "";
					} else if (row.type === VALUE_TYPES.BINARY) {
						value = row.binary_value ?? "";
					} else if (row.type === VALUE_TYPES.OBJECT || row.type === VALUE_TYPES.ARRAY) {
						value = JSON.parse(row.json_value) ?? (row.type === VALUE_TYPES.ARRAY ? [] : {});
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
		} catch (error) {
			this.debug.error(`Erro ao buscar registros: ${(error as any)?.message ?? String(error)}`);
			throw error;
		}
	}

	async setNode(database: string, path: string, content: StorageNode) {
		if (!(database in this.sequelize.models && database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		if (content.type === VALUE_TYPES.EMPTY || content.value === null || content.value === undefined) {
			return;
		}

		try {
			const data = {
				path: path,
				type: content.type,
				text_value: content.type === VALUE_TYPES.STRING || content.type === VALUE_TYPES.REFERENCE ? (content.value as string) : null,
				binary_value: content.type === VALUE_TYPES.BINARY ? (content.value as string) : null,
				json_value: content.type === VALUE_TYPES.OBJECT || content.type === VALUE_TYPES.ARRAY ? JSON.stringify(content.value) : null,
				revision: content.revision,
				revision_nr: content.revision_nr,
				created: content.created,
				modified: content.modified,
			};

			this.pending[database].set(path, data);

			await this.sequelize.models[database].upsert(data);

			this.pending[database].delete(path);
		} catch (error) {
			this.debug.error(`Erro ao inserir registro: ${(error as any)?.message ?? String(error)}`);
			throw error;
		}
	}

	async removeNode(database: string, path: string) {
		if (!(database in this.sequelize.models && database in this.pending)) {
			throw ERROR_FACTORY.create(AppError.DB_NOT_FOUND, { dbName: database });
		}

		if (path === "") {
			return;
		}

		if (this.pending[database].has(path)) {
			this.pending[database].delete(path);
		}

		try {
			await this.sequelize.models[database].destroy({
				where: {
					[Op.or]: [{ path: path }, { path: { [Op.like]: `${path}/%` } }, { path: { [Op.like]: `${path}[%'` } }],
				},
			});
		} catch (error) {
			this.debug.error(`Erro ao remover registro: ${(error as any)?.message ?? String(error)}`);
			throw error;
		}
	}
}
