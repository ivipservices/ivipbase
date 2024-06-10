import { ErrorFactory, ErrorMap } from "./util";

export const enum AppError {
	NO_APP = "no-app",
	BAD_APP_NAME = "bad-app-name",
	DUPLICATE_APP = "duplicate-app",
	APP_DELETED = "app-deleted",
	DB_DISCONNECTED = "db-disconnected",
	DB_CONNECTION_ERROR = "db-connection-error",
	DB_NOT_FOUND = "db-not-found",
	INVALID_ARGUMENT = "invalid-argument",
}

const ERRORS: ErrorMap<AppError> = {
	[AppError.NO_APP]: "Nenhum aplicativo iVipBase '{$appName}' foi criado - " + "chame inicializeApp() primeiro",
	[AppError.BAD_APP_NAME]: "Nome de aplicativo ilegal: '{$appName}",
	[AppError.DUPLICATE_APP]: "O aplicativo Firebase chamado '{$appName}' já existe com diferentes opções ou configurações",
	[AppError.APP_DELETED]: "Aplicativo iVipBase chamado '{$appName}' já excluído",
	[AppError.DB_DISCONNECTED]: "Banco de dados '{$dbName}' desconectado",
	[AppError.DB_CONNECTION_ERROR]: "Database connection error: {$error}",
	[AppError.DB_NOT_FOUND]: "Banco de dados '{$dbName}' não encontrado",
	[AppError.INVALID_ARGUMENT]: "Invalid argument: {$message}",
};

interface ErrorParams {
	[AppError.NO_APP]: { appName: string };
	[AppError.BAD_APP_NAME]: { appName: string };
	[AppError.DUPLICATE_APP]: { appName: string };
	[AppError.APP_DELETED]: { appName: string };
	[AppError.DB_DISCONNECTED]: { dbName: string };
	[AppError.DB_CONNECTION_ERROR]: { error: string };
	[AppError.DB_NOT_FOUND]: { dbName: string };
	[AppError.INVALID_ARGUMENT]: { message: string };
}

export const ERROR_FACTORY = new ErrorFactory<AppError, ErrorParams>("app", "iVipBase", ERRORS);
