import addContextMiddleware from "../../middleware/context.js";
import addGetDataRoute from "./get.js";
import addSetDataRoute from "./set.js";
import addExistsRoute from "./exists.js";
import addExportDataRoute from "./export.js";
import addQueryRoute from "./query.js";
import addReflectRoute from "./reflect.js";
import addGetSchemaRoute from "./schema-get.js";
import addSetSchemaRoute from "./schema-set.js";
import addTestSchemaRoute from "./schema-test.js";
import addListSchemasRoute from "./schemas-list.js";
import addTransactionRoutes from "./transaction.js";
import addImportDataRoute from "./import.js";
import addUpdateDataRoute from "./update.js";
export const addRoutes = (env) => {
    // Adicione middleware de contexto que lida com o cabeçalho DataBase-Context
    addContextMiddleware(env);
    // Adicionar ponto de extremidade de obtenção de dados
    addGetDataRoute(env);
    // Add update data endpoint
    addUpdateDataRoute(env);
    // Add set data endpoint
    addSetDataRoute(env);
    // add transaction routes (start & finish)
    addTransactionRoutes(env);
    // Adicionar endpoint existente
    addExistsRoute(env);
    // Add reflect endpoint
    addReflectRoute(env);
    // Add import endpoint
    addImportDataRoute(env);
    // Add export endpoint
    addExportDataRoute(env);
    // Add query endpoint
    addQueryRoute(env);
    // Add index endpoints:
    // addListIndexesRoute(env);       // list indexes
    // addCreateIndexRoute(env);       // create index
    // addDeleteIndexRoute(env);       // delete index
    // Add schema endpoints:
    addListSchemasRoute(env); // list all
    addGetSchemaRoute(env); // get schema
    addSetSchemaRoute(env); // set schema
    addTestSchemaRoute(env); // test
    // Add sync mutations endpoint
    // addSyncMutationsRoute(env);
    // add sync changes endpoint
    // addSyncChangesRoute(env);
};
export default addRoutes;
//# sourceMappingURL=index.js.map