import { MongoClient, Db } from 'mongodb';
import { AceBaseBase } from 'acebase-core';
import { LocalApi } from './MongoDBLocalApi';
import type { ServerConfig } from '../server/settings';
export * from './MongoDBTransaction';
export type MongodbSettings = {
    host: string;
    port: number;
    database?: string;
    username?: string;
    password?: string;
    options?: Record<string, any>;
};
export declare class MongoDBPreparer {
    readonly config: MongodbSettings;
    readonly uri: string;
    readonly client: MongoClient;
    db: Db;
    constructor(config: MongodbSettings);
    connect(): Promise<void>;
}
export declare class DataBase extends AceBaseBase {
    /**
     * @internal (for internal use)
     */
    api: LocalApi;
    /**
     * @param dbname Name of the database to open or create
     */
    constructor(dbname: string, apiSettings: {
        mongodb: MongoDBPreparer;
        settings: ServerConfig;
        cacheSeconds?: number;
    });
}
//# sourceMappingURL=index.d.ts.map