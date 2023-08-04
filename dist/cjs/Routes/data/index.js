"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const context_1 = require("../../Middleware/context");
const get_1 = require("./get");
const update_1 = require("./update");
const set_1 = require("./set");
const transaction_1 = require("./transaction");
const exists_1 = require("./exists");
const reflect_1 = require("./reflect");
const import_1 = require("./import");
const export_1 = require("./export");
const query_1 = require("./query");
// Indexes:
const index_list_1 = require("./index-list");
const index_create_1 = require("./index-create");
const index_delete_1 = require("./index-delete");
// Schemas:
const schemas_list_1 = require("./schemas-list");
const schema_get_1 = require("./schema-get");
const schema_set_1 = require("./schema-set");
const schema_test_1 = require("./schema-test");
// Sycnronization:
const sync_mutations_1 = require("./sync-mutations");
const sync_changes_1 = require("./sync-changes");
const addRoutes = (env) => {
    // Add context middleware that handles AceBase-Context header
    (0, context_1.default)(env);
    // Add get data endpoint
    (0, get_1.default)(env);
    // Add update data endpoint
    (0, update_1.default)(env);
    // Add set data endpoint
    (0, set_1.default)(env);
    // add transaction routes (start & finish)
    (0, transaction_1.default)(env);
    // Add exists endpoint
    (0, exists_1.default)(env);
    // Add reflect endpoint
    (0, reflect_1.default)(env);
    // Add import endpoint
    (0, import_1.default)(env);
    // Add export endpoint
    (0, export_1.default)(env);
    // Add query endpoint
    (0, query_1.default)(env);
    // Add index endpoints:
    (0, index_list_1.default)(env); // list indexes
    (0, index_create_1.default)(env); // create index
    (0, index_delete_1.default)(env); // delete index
    // Add schema endpoints:
    (0, schemas_list_1.default)(env); // list all
    (0, schema_get_1.default)(env); // get schema
    (0, schema_set_1.default)(env); // set schema
    (0, schema_test_1.default)(env); // test
    // Add sync mutations endpoint
    (0, sync_mutations_1.default)(env);
    // add sync changes endpoint
    (0, sync_changes_1.default)(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map