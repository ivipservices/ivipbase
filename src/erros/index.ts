import { ErrorFactory, ErrorMap } from "./util";

export const enum AppError {
	NO_APP = "no-app",
	BAD_APP_NAME = "bad-app-name",
	DUPLICATE_APP = "duplicate-app",
	APP_DELETED = "app-deleted",
}

const ERRORS: ErrorMap<AppError> = {
	[AppError.NO_APP]: "Nenhum aplicativo iVipBase '{$appName}' foi criado - " + "chame inicializeApp() primeiro",
	[AppError.BAD_APP_NAME]: "Nome de aplicativo ilegal: '{$appName}",
	[AppError.DUPLICATE_APP]: "O aplicativo Firebase chamado '{$appName}' já existe com diferentes opções ou configurações",
	[AppError.APP_DELETED]: "Aplicativo iVipBase chamado '{$appName}' já excluído",
};

interface ErrorParams {
	[AppError.NO_APP]: { appName: string };
	[AppError.BAD_APP_NAME]: { appName: string };
	[AppError.DUPLICATE_APP]: { appName: string };
	[AppError.APP_DELETED]: { appName: string };
}

export const ERROR_FACTORY = new ErrorFactory<AppError, ErrorParams>("app", "Firebase", ERRORS);
