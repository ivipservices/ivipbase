"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
const index_1 = require("../index.js");
const password = "9Hq91q5oExU9biOZ7yq98I8P1DU1ge";
const db = new index_1.SyncMongoServer("ivipcoin-db", {
    host: "127.0.0.1",
    port: 4048,
    maxPayloadSize: "50mb",
    authentication: {
        enabled: true,
        allowUserSignup: true,
        defaultAccessRule: "auth",
        defaultAdminPassword: password,
    },
    mongodb: {
        host: "ivipcoin-api.com",
        port: 4048,
        username: "gestor",
        password: password,
        database: "root",
    },
});
//# sourceMappingURL=index.js.map