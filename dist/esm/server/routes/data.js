"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const context_1 = require("../middleware/context.js");
const data_get_1 = require("./data-get.js");
const data_update_1 = require("./data-update.js");
const data_set_1 = require("./data-set.js");
const data_transaction_1 = require("./data-transaction.js");
const data_exists_1 = require("./data-exists.js");
const data_reflect_1 = require("./data-reflect.js");
const data_import_1 = require("./data-import.js");
const data_export_1 = require("./data-export.js");
const data_query_1 = require("./data-query.js");
// Indexes:
const data_index_list_1 = require("./data-index-list.js");
const data_index_create_1 = require("./data-index-create.js");
const data_index_delete_1 = require("./data-index-delete.js");
// Schemas:
const data_schemas_list_1 = require("./data-schemas-list.js");
const data_schema_get_1 = require("./data-schema-get.js");
const data_schema_set_1 = require("./data-schema-set.js");
const data_schema_test_1 = require("./data-schema-test.js");
// Sycnronization:
const data_sync_mutations_1 = require("./data-sync-mutations.js");
const data_sync_changes_1 = require("./data-sync-changes.js");
const addRoutes = (env) => {
    // Add context middleware that handles AceBase-Context header
    (0, context_1.default)(env);
    // Add get data endpoint
    (0, data_get_1.default)(env);
    // Add update data endpoint
    (0, data_update_1.default)(env);
    // Add set data endpoint
    (0, data_set_1.default)(env);
    // add transaction routes (start & finish)
    (0, data_transaction_1.default)(env);
    // Add exists endpoint
    (0, data_exists_1.default)(env);
    // Add reflect endpoint
    (0, data_reflect_1.default)(env);
    // Add import endpoint
    (0, data_import_1.default)(env);
    // Add export endpoint
    (0, data_export_1.default)(env);
    // Add query endpoint
    (0, data_query_1.default)(env);
    // Add index endpoints:
    (0, data_index_list_1.default)(env); // list indexes
    (0, data_index_create_1.default)(env); // create index
    (0, data_index_delete_1.default)(env); // delete index
    // Add schema endpoints:
    (0, data_schemas_list_1.default)(env); // list all
    (0, data_schema_get_1.default)(env); // get schema
    (0, data_schema_set_1.default)(env); // set schema
    (0, data_schema_test_1.default)(env); // test
    // Add sync mutations endpoint
    (0, data_sync_mutations_1.default)(env);
    // add sync changes endpoint
    (0, data_sync_changes_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=data.js.map