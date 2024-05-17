"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const addRoute = (env) => {
    env.router.get(`/projects`, async (req, res) => {
        var _a;
        const dbs = env.dbNames;
        const list = [];
        for (const db of dbs) {
            const dbInfo = env.db(db);
            list.push({
                name: db,
                description: (_a = dbInfo.description) !== null && _a !== void 0 ? _a : "No description",
                type: "database",
            });
        }
        res.send(list);
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=projects.js.map