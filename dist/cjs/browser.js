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
exports.TypeMappings = exports.EventSubscription = exports.EventPublisher = exports.EventStream = exports.MutationsDataSnapshot = exports.DataSnapshot = exports.DataReferencesArray = exports.DataSnapshotsArray = exports.QueryDataRetrievalOptions = exports.DataRetrievalOptions = exports.DataReferenceQuery = exports.DataReference = exports.ObjectCollection = exports.PartialArray = exports.SimpleObservable = exports.SchemaDefinition = exports.ID = exports.ascii85 = exports.Utils = exports.SimpleCache = exports.SimpleEventEmitter = exports.PathReference = exports.PathInfo = exports.DataStorageSettings = exports.CustomStorage = void 0;
var storage_1 = require("./controller/storage");
Object.defineProperty(exports, "CustomStorage", { enumerable: true, get: function () { return storage_1.CustomStorage; } });
Object.defineProperty(exports, "DataStorageSettings", { enumerable: true, get: function () { return storage_1.DataStorageSettings; } });
__exportStar(require("./app"), exports);
__exportStar(require("./database"), exports);
__exportStar(require("./auth"), exports);
__exportStar(require("./storage"), exports);
__exportStar(require("./ipc"), exports);
var ivipbase_core_1 = require("ivipbase-core");
Object.defineProperty(exports, "PathInfo", { enumerable: true, get: function () { return ivipbase_core_1.PathInfo; } });
Object.defineProperty(exports, "PathReference", { enumerable: true, get: function () { return ivipbase_core_1.PathReference; } });
Object.defineProperty(exports, "SimpleEventEmitter", { enumerable: true, get: function () { return ivipbase_core_1.SimpleEventEmitter; } });
Object.defineProperty(exports, "SimpleCache", { enumerable: true, get: function () { return ivipbase_core_1.SimpleCache; } });
Object.defineProperty(exports, "Utils", { enumerable: true, get: function () { return ivipbase_core_1.Utils; } });
Object.defineProperty(exports, "ascii85", { enumerable: true, get: function () { return ivipbase_core_1.ascii85; } });
Object.defineProperty(exports, "ID", { enumerable: true, get: function () { return ivipbase_core_1.ID; } });
Object.defineProperty(exports, "SchemaDefinition", { enumerable: true, get: function () { return ivipbase_core_1.SchemaDefinition; } });
Object.defineProperty(exports, "SimpleObservable", { enumerable: true, get: function () { return ivipbase_core_1.SimpleObservable; } });
Object.defineProperty(exports, "PartialArray", { enumerable: true, get: function () { return ivipbase_core_1.PartialArray; } });
Object.defineProperty(exports, "ObjectCollection", { enumerable: true, get: function () { return ivipbase_core_1.ObjectCollection; } });
var ivipbase_core_2 = require("ivipbase-core");
Object.defineProperty(exports, "DataReference", { enumerable: true, get: function () { return ivipbase_core_2.DataReference; } });
Object.defineProperty(exports, "DataReferenceQuery", { enumerable: true, get: function () { return ivipbase_core_2.DataReferenceQuery; } });
Object.defineProperty(exports, "DataRetrievalOptions", { enumerable: true, get: function () { return ivipbase_core_2.DataRetrievalOptions; } });
Object.defineProperty(exports, "QueryDataRetrievalOptions", { enumerable: true, get: function () { return ivipbase_core_2.QueryDataRetrievalOptions; } });
Object.defineProperty(exports, "DataSnapshotsArray", { enumerable: true, get: function () { return ivipbase_core_2.DataSnapshotsArray; } });
Object.defineProperty(exports, "DataReferencesArray", { enumerable: true, get: function () { return ivipbase_core_2.DataReferencesArray; } });
var ivipbase_core_3 = require("ivipbase-core");
Object.defineProperty(exports, "DataSnapshot", { enumerable: true, get: function () { return ivipbase_core_3.DataSnapshot; } });
Object.defineProperty(exports, "MutationsDataSnapshot", { enumerable: true, get: function () { return ivipbase_core_3.MutationsDataSnapshot; } });
var ivipbase_core_4 = require("ivipbase-core");
Object.defineProperty(exports, "EventStream", { enumerable: true, get: function () { return ivipbase_core_4.EventStream; } });
Object.defineProperty(exports, "EventPublisher", { enumerable: true, get: function () { return ivipbase_core_4.EventPublisher; } });
Object.defineProperty(exports, "EventSubscription", { enumerable: true, get: function () { return ivipbase_core_4.EventSubscription; } });
var ivipbase_core_5 = require("ivipbase-core");
Object.defineProperty(exports, "TypeMappings", { enumerable: true, get: function () { return ivipbase_core_5.TypeMappings; } });
//# sourceMappingURL=browser.js.map