import addInfoRoute from "./info.js";
import addPingRoute from "./ping.js";
import addStatsRoute from "./stats.js";
export const addRoutes = (env) => {
    // Adicionar ponto de extremidade de informações
    addInfoRoute(env);
    // Adicionar ponto de extremidade de ping
    addPingRoute(env);
    // Adicionar ponto de extremidade de estatísticas do banco de dados
    addStatsRoute(env);
    // Adicionar ponto de extremidade de logs (apenas para administradores)
    //addLogsRoute(env);
};
export default addRoutes;
//# sourceMappingURL=index.js.map