"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const context_1 = __importDefault(require("../../middleware/context"));
const get_1 = __importDefault(require("./get"));
const set_1 = __importDefault(require("./set"));
const exists_1 = __importDefault(require("./exists"));
const export_1 = __importDefault(require("./export"));
const query_1 = __importDefault(require("./query"));
const reflect_1 = __importDefault(require("./reflect"));
const schema_get_1 = __importDefault(require("./schema-get"));
const schema_set_1 = __importDefault(require("./schema-set"));
const schema_test_1 = __importDefault(require("./schema-test"));
const schemas_list_1 = __importDefault(require("./schemas-list"));
const transaction_1 = __importDefault(require("./transaction"));
const import_1 = __importDefault(require("./import"));
const update_1 = __importDefault(require("./update"));
const addRoutes = (env) => {
    // Adicione middleware de contexto que lida com o cabeçalho DataBase-Context
    (0, context_1.default)(env);
    // Adicionar ponto de extremidade de obtenção de dados
    (0, get_1.default)(env);
    // Add update data endpoint
    (0, update_1.default)(env);
    // Add set data endpoint
    (0, set_1.default)(env);
    // add transaction routes (start & finish)
    (0, transaction_1.default)(env);
    // Adicionar endpoint existente
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
    // addListIndexesRoute(env);       // list indexes
    // addCreateIndexRoute(env);       // create index
    // addDeleteIndexRoute(env);       // delete index
    // Add schema endpoints:
    (0, schemas_list_1.default)(env); // list all
    (0, schema_get_1.default)(env); // get schema
    (0, schema_set_1.default)(env); // set schema
    (0, schema_test_1.default)(env); // test
    // Add sync mutations endpoint
    // addSyncMutationsRoute(env);
    // add sync changes endpoint
    // addSyncChangesRoute(env);
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=index.js.map