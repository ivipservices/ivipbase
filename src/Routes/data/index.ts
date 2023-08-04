import { RouteInitEnvironment } from "src/types";
import addContextMiddleware from "src/Middleware/context";
import addGetDataRoute from "./get";
import addUpdateDataRoute from "./update";
import addSetDataRoute from "./set";
import addTransactionRoutes from "./transaction";
import addExistsRoute from "./exists";
import addReflectRoute from "./reflect";
import addImportDataRoute from "./import";
import addExportDataRoute from "./export";
import addQueryRoute from "./query";

// Indexes:
import addListIndexesRoute from "./index-list";
import addCreateIndexRoute from "./index-create";
import addDeleteIndexRoute from "./index-delete";

// Schemas:
import addListSchemasRoute from "./schemas-list";
import addGetSchemaRoute from "./schema-get";
import addSetSchemaRoute from "./schema-set";
import addTestSchemaRoute from "./schema-test";

// Sycnronization:
import addSyncMutationsRoute from "./sync-mutations";
import addSyncChangesRoute from "./sync-changes";

export const addRoutes = (env: RouteInitEnvironment) => {
	// Add context middleware that handles AceBase-Context header
	addContextMiddleware(env);

	// Add get data endpoint
	addGetDataRoute(env);

	// Add update data endpoint
	addUpdateDataRoute(env);

	// Add set data endpoint
	addSetDataRoute(env);

	// add transaction routes (start & finish)
	addTransactionRoutes(env);

	// Add exists endpoint
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
	addListIndexesRoute(env); // list indexes
	addCreateIndexRoute(env); // create index
	addDeleteIndexRoute(env); // delete index

	// Add schema endpoints:
	addListSchemasRoute(env); // list all
	addGetSchemaRoute(env); // get schema
	addSetSchemaRoute(env); // set schema
	addTestSchemaRoute(env); // test

	// Add sync mutations endpoint
	addSyncMutationsRoute(env);

	// add sync changes endpoint
	addSyncChangesRoute(env);
};

export default addRoutes;
