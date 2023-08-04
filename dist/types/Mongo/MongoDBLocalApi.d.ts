import { AceBaseBase, Api, LoggingLevel } from "acebase-core";
import { Storage } from "acebase/dist/types/storage";
import type { MongoDBPreparer } from ".";
import type { ServerConfig } from "../server/settings";
export declare class LocalApi extends Api {
    db: AceBaseBase;
    storage: Storage;
    logLevel: LoggingLevel;
    private cache;
    constructor(dbname: string, init: {
        mongodb: MongoDBPreparer;
        db: AceBaseBase;
        settings: ServerConfig;
        cacheSeconds?: number;
    }, readyCallback: () => any);
}
//# sourceMappingURL=MongoDBLocalApi.d.ts.map