"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __exportStar = (this && this.__exportStar) || function(m, exports) {
    for (var p in m) if (p !== "default" && !Object.prototype.hasOwnProperty.call(exports, p)) __createBinding(exports, m, p);
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.SequelizeSettings = exports.SqliteSettings = exports.JsonFileStorageSettings = exports.MongodbSettings = void 0;
__exportStar(require("./browser"), exports);
var storage_1 = require("./controller/storage");
Object.defineProperty(exports, "MongodbSettings", { enumerable: true, get: function () { return storage_1.MongodbSettings; } });
Object.defineProperty(exports, "JsonFileStorageSettings", { enumerable: true, get: function () { return storage_1.JsonFileStorageSettings; } });
Object.defineProperty(exports, "SqliteSettings", { enumerable: true, get: function () { return storage_1.SqliteSettings; } });
Object.defineProperty(exports, "SequelizeSettings", { enumerable: true, get: function () { return storage_1.SequelizeSettings; } });
//# sourceMappingURL=index.js.map