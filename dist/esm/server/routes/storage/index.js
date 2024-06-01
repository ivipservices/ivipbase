import addPutRoute from "./put.js";
import addDeleteRoute from "./delete.js";
export const addRoutes = (env) => {
    addPutRoute(env);
    addDeleteRoute(env);
};
export default addRoutes;
//# sourceMappingURL=index.js.map