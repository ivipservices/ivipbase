"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequelizeStorage = exports.SequelizeSettings = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const erros_1 = require("../erros");
const CustomStorage_1 = require("./CustomStorage");
const MDE_1 = require("./MDE");
const sequelize_1 = require("sequelize");
class SequelizeSettings extends CustomStorage_1.CustomStorageSettings {
    constructor(options = {}) {
        var _a;
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
        this.options = Object.assign(Object.assign({}, ((_a = options.options) !== null && _a !== void 0 ? _a : {})), { logging: false });
        if (options.sequelize instanceof sequelize_1.Sequelize) {
            this.sequelize = options.sequelize;
        }
    }
}
exports.SequelizeSettings = SequelizeSettings;
class SequelizeStorage extends CustomStorage_1.CustomStorage {
    constructor(database, options = {}) {
        super(options);
        this.database = database;
        this.pending = {};
        this.dbName = "SequelizeStorage";
        if (options.sequelize instanceof sequelize_1.Sequelize) {
            this.sequelize = options.sequelize;
        }
        else if (options.database && options.username && options.password) {
            this.sequelize = new sequelize_1.Sequelize(options.database, options.username, options.password, options.options);
        }
        else if (options.database && options.username) {
            this.sequelize = new sequelize_1.Sequelize(options.database, options.username, options.options);
        }
        else if (options.uri) {
            this.sequelize = new sequelize_1.Sequelize(options.uri, options.options);
        }
        else if (options.options) {
            this.sequelize = new sequelize_1.Sequelize(options.options);
        }
        else {
            this.sequelize = new sequelize_1.Sequelize({
                dialect: "sqlite",
                storage: ":memory:",
            });
        }
        this.initialize();
    }
    async initialize() {
        var _a;
        try {
            const dbs = (Array.isArray(this.database) ? this.database : [this.database]).filter((name) => typeof name === "string" && name.trim() !== "").filter((a, i, l) => l.indexOf(a) === i);
            for (const db of dbs) {
                this.pending[db] = new Map();
                this.sequelize.define(db, {
                    path: {
                        type: sequelize_1.DataTypes.TEXT,
                        primaryKey: true,
                    },
                    type: {
                        type: sequelize_1.DataTypes.INTEGER,
                        allowNull: false,
                    },
                    text_value: sequelize_1.DataTypes.TEXT,
                    binary_value: sequelize_1.DataTypes.BLOB,
                    json_value: sequelize_1.DataTypes.TEXT,
                    created: {
                        type: sequelize_1.DataTypes.INTEGER,
                        allowNull: false,
                    },
                    modified: {
                        type: sequelize_1.DataTypes.INTEGER,
                        allowNull: false,
                    },
                    revision_nr: {
                        type: sequelize_1.DataTypes.INTEGER,
                        allowNull: false,
                    },
                    revision: {
                        type: sequelize_1.DataTypes.TEXT,
                        allowNull: false,
                    },
                });
            }
            await this.sequelize.sync();
            for (const db of dbs) {
                const rows = [
                    {
                        path: this.settings.prefix,
                        type: MDE_1.VALUE_TYPES.OBJECT,
                        text_value: null,
                        binary_value: null,
                        json_value: "{}",
                        created: Date.now(),
                        modified: Date.now(),
                        revision_nr: 0,
                        revision: ivipbase_core_1.ID.generate(),
                    },
                ];
                for (let row of rows) {
                    await this.sequelize.models[db].upsert(row);
                }
            }
            this.emit("ready");
        }
        catch (err) {
            this.debug.error(`Erro ao inicializar o banco de dados: ${(_a = err === null || err === void 0 ? void 0 : err.message) !== null && _a !== void 0 ? _a : String(err)}`);
            this.emit("error", err);
        }
    }
    async getMultiple(database, expression, simplifyValues = false) {
        var _a;
        if (!(database in this.sequelize.models && database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        try {
            const pendingList = Array.from(this.pending[database].values()).filter((row) => expression.test(row.path));
            const rows = await this.sequelize.models[database]
                .findAll({
                attributes: ["path", "type", "text_value", "json_value", "revision", "revision_nr", "created", "modified"],
            })
                .then((rows) => {
                return Promise.resolve(rows.filter((row) => "path" in row && typeof row["path"] === "string" && expression.test(row["path"])));
            });
            const list = await Promise.all(rows.map(async (row) => {
                if ([MDE_1.VALUE_TYPES.BINARY].includes(row.type) && !simplifyValues) {
                    return await this.sequelize.models[database]
                        .findOne({
                        where: {
                            path: row.path,
                        },
                        attributes: ["path", "binary_value"],
                    })
                        .then((r) => {
                        var _a;
                        row.binary_value = r ? (_a = r.binary_value) !== null && _a !== void 0 ? _a : null : null;
                        return Promise.resolve(row);
                    })
                        .catch((err) => {
                        return Promise.resolve(row);
                    });
                }
                return Promise.resolve(row);
            }));
            const result = pendingList
                .concat(list)
                .filter((row, i, l) => {
                return l.findIndex((r) => r.path === row.path) === i;
            })
                .map((row) => {
                var _a, _b, _c;
                let value = null;
                if (row.type === MDE_1.VALUE_TYPES.STRING || row.type === MDE_1.VALUE_TYPES.REFERENCE) {
                    value = (_a = row.text_value) !== null && _a !== void 0 ? _a : "";
                }
                else if (row.type === MDE_1.VALUE_TYPES.BINARY) {
                    value = (_b = row.binary_value) !== null && _b !== void 0 ? _b : "";
                }
                else if (row.type === MDE_1.VALUE_TYPES.OBJECT || row.type === MDE_1.VALUE_TYPES.ARRAY) {
                    value = (_c = JSON.parse(row.json_value)) !== null && _c !== void 0 ? _c : (row.type === MDE_1.VALUE_TYPES.ARRAY ? [] : {});
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
        catch (error) {
            this.debug.error(`Erro ao buscar registros: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`);
            throw error;
        }
    }
    async setNode(database, path, content) {
        var _a;
        if (!(database in this.sequelize.models && database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
        }
        if (content.type === MDE_1.VALUE_TYPES.EMPTY || content.value === null || content.value === undefined) {
            return;
        }
        try {
            const data = {
                path: path,
                type: content.type,
                text_value: content.type === MDE_1.VALUE_TYPES.STRING || content.type === MDE_1.VALUE_TYPES.REFERENCE ? content.value : null,
                binary_value: content.type === MDE_1.VALUE_TYPES.BINARY ? content.value : null,
                json_value: content.type === MDE_1.VALUE_TYPES.OBJECT || content.type === MDE_1.VALUE_TYPES.ARRAY ? JSON.stringify(content.value) : null,
                revision: content.revision,
                revision_nr: content.revision_nr,
                created: content.created,
                modified: content.modified,
            };
            this.pending[database].set(path, data);
            await this.sequelize.models[database].upsert(data);
            this.pending[database].delete(path);
        }
        catch (error) {
            this.debug.error(`Erro ao inserir registro: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`);
            throw error;
        }
    }
    async removeNode(database, path) {
        var _a;
        if (!(database in this.sequelize.models && database in this.pending)) {
            throw erros_1.ERROR_FACTORY.create("db-not-found" /* AppError.DB_NOT_FOUND */, { dbName: database });
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
                    [sequelize_1.Op.or]: [{ path: path }, { path: { [sequelize_1.Op.like]: `${path}/%` } }, { path: { [sequelize_1.Op.like]: `${path}[%'` } }],
                },
            });
        }
        catch (error) {
            this.debug.error(`Erro ao remover registro: ${(_a = error === null || error === void 0 ? void 0 : error.message) !== null && _a !== void 0 ? _a : String(error)}`);
            throw error;
        }
    }
}
exports.SequelizeStorage = SequelizeStorage;
//# sourceMappingURL=SequelizeStorage.js.map