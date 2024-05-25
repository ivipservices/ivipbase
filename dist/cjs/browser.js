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
exports.ID = exports.ascii85 = exports.PathReference = exports.Utils = exports.SimpleCache = exports.SimpleEventEmitter = exports.PathInfo = exports.DataStorageSettings = exports.CustomStorage = void 0;
var storage_1 = require("./controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
__exportStar(require("./app"), exports);
__exportStar(require("./database"), exports);
__exportStar(require("./auth"), exports);
var ivipbase_core_1 = require("ivipbase-core");
Object.defineProperty(exports, "PathInfo", { enumerable: true, get: function () { return ivipbase_core_1.PathInfo; } });
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return ivipbase_core_1.SimpleEventEmitter; } });
Object.defineProperty(exports, "SimpleCache", { enumerable: true, get: function () { return ivipbase_core_1.SimpleCache; } });
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return ivipbase_core_1.Utils; } });
Object.defineProperty(exports, "PathReference", { enumerable: true, get: function () { return ivipbase_core_1.PathReference; } });
Object.defineProperty(exports, "ascii85", { enumerable: true, get: function () { return ivipbase_core_1.ascii85; } });
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return ivipbase_core_1.ID; } });
//# sourceMappingURL=browser.js.map