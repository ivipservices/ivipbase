"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const info_1 = __importDefault(require("./info"));
const ping_1 = __importDefault(require("./ping"));
const stats_1 = __importDefault(require("./stats"));
const projects_1 = __importDefault(require("./projects"));
const addRoutes = (env) => {
    // Adicionar ponto de extremidade de informações
    (0, info_1.default)(env);
    // Adicionar ponto de extremidade de ping
    (0, ping_1.default)(env);
    // Adicionar ponto de extremidade de estatísticas do banco de dados
    (0, stats_1.default)(env);
    (0, projects_1.default)(env);
    // Adicionar ponto de extremidade de logs (apenas para administradores)
    //addLogsRoute(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map