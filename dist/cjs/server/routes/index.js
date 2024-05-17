"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addWebManagerRoutes = exports.addAuthenticionRoutes = exports.addDataRoutes = exports.addMetadataRoutes = void 0;
var meta_1 = require("./meta");
Object.defineProperty(exports, "addMetadataRoutes", { enumerable: true, get: function () { return __importDefault(meta_1).default; } });
var data_1 = require("./data");
Object.defineProperty(exports, "addDataRoutes", { enumerable: true, get: function () { return __importDefault(data_1).default; } });
var auth_1 = require("./auth");
Object.defineProperty(exports, "addAuthenticionRoutes", { enumerable: true, get: function () { return __importDefault(auth_1).default; } });
var webmanager_1 = require("./webmanager");
Object.defineProperty(exports, "addWebManagerRoutes", { enumerable: true, get: function () { return __importDefault(webmanager_1).default; } });
//# sourceMappingURL=index.js.map