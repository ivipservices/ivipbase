import type { LocalServer } from "../..";

import addPutRoute from "./put";
import addDeleteRoute from "./delete";
import addGetRoute from "./get";
import addGetDownloadUrlRoute from "./get-download-url";
import addListRoute from "./list";

export const addRoutes = (env: LocalServer) => {
	addGetRoute(env);

	addPutRoute(env);

	addDeleteRoute(env);

	addGetDownloadUrlRoute(env);

	addListRoute(env);
};

export default addRoutes;
