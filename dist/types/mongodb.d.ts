import { MongoClient, Db } from 'mongodb';
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
//# sourceMappingURL=mongodb.d.ts.map