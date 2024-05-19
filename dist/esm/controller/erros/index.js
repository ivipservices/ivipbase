import { ErrorFactory } from "./util.js";
const ERRORS = {
    ["no-app" /* AppError.NO_APP */]: "Nenhum aplicativo iVipBase '{$appName}' foi criado - " + "chame inicializeApp() primeiro",
    ["bad-app-name" /* AppError.BAD_APP_NAME */]: "Nome de aplicativo ilegal: '{$appName}",
    ["duplicate-app" /* AppError.DUPLICATE_APP */]: "O aplicativo Firebase chamado '{$appName}' já existe com diferentes opções ou configurações",
    ["app-deleted" /* AppError.APP_DELETED */]: "Aplicativo iVipBase chamado '{$appName}' já excluído",
    ["db-disconnected" /* AppError.DB_DISCONNECTED */]: "Banco de dados '{$dbName}' desconectado",
    ["db-connection-error" /* AppError.DB_CONNECTION_ERROR */]: "Database connection error: {$error}",
    ["db-not-found" /* AppError.DB_NOT_FOUND */]: "Banco de dados '{$dbName}' não encontrado",
};
export const ERROR_FACTORY = new ErrorFactory("app", "iVipBase", ERRORS);
//# sourceMappingURL=index.js.map