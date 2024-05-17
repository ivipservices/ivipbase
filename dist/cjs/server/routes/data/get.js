"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoutes = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const error_1 = require("../../shared/error");
const addRoutes = (env) => {
    env.router.get(`/data/:dbName/*`, async (req, res) => {
        var _a, _b, _c, _d;
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        // Solicitar dados
        const path = req.params["0"];
        const user = (_a = req.user) !== null && _a !== void 0 ? _a : {};
        // Pré-verifique o acesso de leitura
        let access = await env.rules(dbName).isOperationAllowed(user, path, "get");
        if (!access.allow) {
            return (0, error_1.sendUnauthorizedError)(res, access.code, access.message);
        }
        const options = {};
        //const options: Parameters<DataReference.>[1] = {};
        if (req.query.include) {
            options.include = req.query.include.split(",");
        }
        if (req.query.exclude) {
            options.exclude = req.query.exclude.split(",");
        }
        if (["true", "false"].includes((_b = req.query.child_objects) !== null && _b !== void 0 ? _b : "")) {
            options.child_objects = req.query.child_objects === "true";
        }
        if (path === "" && (!user || !user.permission_level || user.permission_level < 1)) {
            // Se o usuário tiver acesso à raiz do banco de dados (NÃO recomendado para outros além do admin...)
            // Não retorna dados do servidor privado. Se o usuário administrador desejar acesso, ele deverá usar
            // direciona solicitações nesses caminhos (GET /data/dbname/__auth__) ou usa reflexão
            if (options.include) {
                // Remova todas as inclusões de caminhos privados
                options.include = options.include.filter((path) => !path.startsWith("__"));
            }
            // Adicione caminhos privados para excluir
            options.exclude = [...((_c = options.exclude) !== null && _c !== void 0 ? _c : []), "__auth__", "__log__"];
        }
        // Check 'get' access
        // access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, 'get', { context: req.context, options });
        // if (!access.allow) {
        //     return sendUnauthorizedError(res, access.code, access.message);
        // }
        try {
            const { value, context } = await env.db(dbName).storage.get(path, options);
            if (!((_d = env.settings.transactions) === null || _d === void 0 ? void 0 : _d.log)) {
                delete context.database_cursor;
            }
            //console.log(value);
            const serialized = ivipbase_core_1.Transport.serialize(value);
            res.setHeader("DataBase-Context", JSON.stringify(context));
            res.send({
                exists: value !== null,
                val: serialized.val,
                map: serialized.map,
            });
        }
        catch (err) {
            res.status(500).send(err);
        }
    });
};
exports.addRoutes = addRoutes;
exports.default = exports.addRoutes;
//# sourceMappingURL=get.js.map