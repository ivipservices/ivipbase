"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const error_1 = require("../../shared/error");
const addRoute = (env) => {
    env.router.get(`/storage-list/:dbName/*`, async (req, res) => {
        const { dbName } = req.params;
        if (!env.hasDatabase(dbName)) {
            return (0, error_1.sendError)(res, {
                code: "not_found",
                message: `Database '${dbName}' not found`,
            });
        }
        const path = req.params["0"];
        const maxResults = req.query.maxResults ? parseInt(req.query.maxResults) : typeof req.body.maxResults === "number" ? req.body.maxResults : undefined;
        const page = req.query.page ? parseInt(req.query.page) : typeof req.body.page === "number" ? req.body.page : 0;
        const isAll = typeof maxResults === "undefined" || isNaN(maxResults !== null && maxResults !== void 0 ? maxResults : NaN);
        try {
            if (isAll) {
                const { items, prefixes } = await env.storageFile(dbName).listAll(path);
                res.send({ items: items.map(({ fullPath }) => fullPath), prefixes: prefixes.map(({ fullPath }) => fullPath) });
            }
            else {
                const _a = await env.storageFile(dbName).list(path, { maxResults, page }), { items, prefixes } = _a, props = __rest(_a, ["items", "prefixes"]);
                res.send(Object.assign(Object.assign({}, props), { items: items.map(({ fullPath }) => fullPath), prefixes: prefixes.map(({ fullPath }) => fullPath) }));
            }
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err);
        }
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=list.js.map