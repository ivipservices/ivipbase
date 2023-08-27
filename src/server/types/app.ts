import type { DataBaseSettings } from "ivipbase-core";
import type { MongoDBPreparer } from "../services/app/ivipBaseApp";

export interface IvipBaseApp {
	readonly name: string;
	readonly options: IvipBaseOptions;
	readonly dbOptions?: Partial<DataBaseSettings>;
	readonly mongoUri: string;
	readonly mongodb: MongoDBPreparer;
}

export interface IvipBaseOptions {
	host: string;
	port: number;
	username?: string;
	password?: string;
	options?: Record<string, any>;
}

export interface IvipBaseSettings {
	name: string;
}