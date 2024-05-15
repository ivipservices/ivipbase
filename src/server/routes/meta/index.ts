import type { LocalServer } from "../../";
import addInfoRoute from "./info";
import addPingRoute from "./ping";
import addStatsRoute from "./stats";
import addProjectsRoute from "./projects";

export const addRoutes = (env: LocalServer) => {
	// Adicionar ponto de extremidade de informações
	addInfoRoute(env);

	// Adicionar ponto de extremidade de ping
	addPingRoute(env);

	// Adicionar ponto de extremidade de estatísticas do banco de dados
	addStatsRoute(env);

	addProjectsRoute(env);

	// Adicionar ponto de extremidade de logs (apenas para administradores)
	//addLogsRoute(env);
};

export default addRoutes;
