import type { LocalServer } from "../../";
import addGetDataRoute from "./get";
import addExistsRoute from "./exists";
import addExportDataRoute from "./export";
import addQueryRoute from "./query";
import addReflectRoute from "./reflect";
import addGetSchemaRoute from "./schema-get";
import addSetSchemaRoute from "./schema-set";
import addTestSchemaRoute from "./schema-test";
import addListSchemasRoute from "./schemas-list";

export const addRoutes = (env: LocalServer) => {
	// Adicione middleware de contexto que lida com o cabeçalho DataBase-Context
	// addContextMiddleware(env);

	// Adicionar ponto de extremidade de obtenção de dados
	addGetDataRoute(env);

	// Add update data endpoint
	// addUpdateDataRoute(env);

	// Add set data endpoint
	// addSetDataRoute(env);

	// add transaction routes (start & finish)
	// addTransactionRoutes(env);

	// Adicionar endpoint existente
	addExistsRoute(env);

	// Add reflect endpoint
	addReflectRoute(env);

	// Add import endpoint
	// addImportDataRoute(env);

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
