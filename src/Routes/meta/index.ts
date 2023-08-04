import type { RouteInitEnvironment } from "src/types";
import addInfoRoute from "./info";
import addPingRoute from "./ping";
import addStatsRoute from "./stats";
import addLogsRoute from "./logs";

export const addRoutes = (env: RouteInitEnvironment) => {
	// Add info endpoint
	addInfoRoute(env);

	// Add ping endpoint
	addPingRoute(env);

	// Add database stats endpoint
	addStatsRoute(env);

	// Add logs endpoint (admin only)
	addLogsRoute(env);
};

export default addRoutes;
