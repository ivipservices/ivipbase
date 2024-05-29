import type { LocalServer } from "../..";

import addPutRoute from "./put";
import addDeleteRoute from "./delete";

export const addRoutes = (env: LocalServer) => {
	addPutRoute(env);

	addDeleteRoute(env);
};

export default addRoutes;
