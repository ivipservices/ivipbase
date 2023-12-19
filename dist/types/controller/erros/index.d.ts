import { ErrorFactory } from "./util";
export declare const enum AppError {
    NO_APP = "no-app",
    BAD_APP_NAME = "bad-app-name",
    DUPLICATE_APP = "duplicate-app",
    APP_DELETED = "app-deleted",
    DB_DISCONNECTED = "db-disconnected",
    DB_CONNECTION_ERROR = "db-connection-error"
}
interface ErrorParams {
    [AppError.NO_APP]: {
        appName: string;
    };
    [AppError.BAD_APP_NAME]: {
        appName: string;
    };
    [AppError.DUPLICATE_APP]: {
        appName: string;
    };
    [AppError.APP_DELETED]: {
        appName: string;
    };
    [AppError.DB_DISCONNECTED]: {
        dbName: string;
    };
    [AppError.DB_CONNECTION_ERROR]: {
        error: string;
    };
}
export declare const ERROR_FACTORY: ErrorFactory<AppError, ErrorParams>;
export {};
//# sourceMappingURL=index.d.ts.map