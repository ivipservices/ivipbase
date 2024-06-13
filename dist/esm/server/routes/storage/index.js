import addPutRoute from "./put.js";
import addDeleteRoute from "./delete.js";
import addGetRoute from "./get.js";
import addGetDownloadUrlRoute from "./get-download-url.js";
import addListRoute from "./list.js";
export const addRoutes = (env) => {
    addGetRoute(env);
    addPutRoute(env);
    addDeleteRoute(env);
    addGetDownloadUrlRoute(env);
    addListRoute(env);
};
export default addRoutes;
//# sourceMappingURL=index.js.map