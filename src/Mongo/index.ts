import { MongoClient, Db } from 'mongodb';
import { encodeURIComponent } from '../lib/Utils';
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

export class MongoDBPreparer {
    readonly uri: string;
    readonly client: MongoClient;
    public db: Db;

    constructor(readonly config: MongodbSettings) {
        const { host, port, database, username, password, options } = this.config;

        // Monta a URI de conexão usando as opções fornecidas
        this.uri = `mongodb://${host}:${port}`;

        if (username && password) {
            this.uri = `mongodb://${username}:${password}@${host}:${port}`;
        }

        if (database) {
            this.uri += `/${database}`;
        }

        if (options) {
            const queryParams = Object.entries(options).map(([key, value]) => `${key}=${encodeURIComponent(JSON.stringify(value))}`);
            this.uri += `?${queryParams.join('&')}`;
        }

        this.client = new MongoClient(this.uri);
    }

    async connect(): Promise<void> {
        try {
            await this.client.connect();
            this.db = this.client.db('root'); // Use the default database
        } catch (error) {
            throw 'Failed to connect to MongoDB:' + String(error);
        }
    }
}

export class DataBase extends AceBaseBase {
    /**
	 * @internal (for internal use)
	 */
    public api: LocalApi;

    /**
	 * @param dbname Name of the database to open or create
	 */
    constructor(dbname: string, apiSettings: { mongodb: MongoDBPreparer; settings: ServerConfig; cacheSeconds?: number }) {
        super(dbname, {});

        this.api = new LocalApi(dbname, { ...apiSettings, db: this }, () => {
            this.emit('ready');
        });
    }
}
