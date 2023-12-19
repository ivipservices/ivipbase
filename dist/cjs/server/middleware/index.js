"use strict";
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.add404Middleware = exports.addSwaggerMiddleware = exports.addAdminOnlyMiddleware = exports.addCacheMiddleware = exports.addCorsMiddleware = void 0;
var cors_1 = require("./cors");
Object.defineProperty(exports, "addCorsMiddleware", { enumerable: true, get: function () { return __importDefault(cors_1).default; } });
var cache_1 = require("./cache");
Object.defineProperty(exports, "addCacheMiddleware", { enumerable: true, get: function () { return __importDefault(cache_1).default; } });
var admin_only_1 = require("./admin-only");
Object.defineProperty(exports, "addAdminOnlyMiddleware", { enumerable: true, get: function () { return __importDefault(admin_only_1).default; } });
var swagger_1 = require("./swagger");
Object.defineProperty(exports, "addSwaggerMiddleware", { enumerable: true, get: function () { return __importDefault(swagger_1).default; } });
var _404_1 = require("./404");
Object.defineProperty(exports, "add404Middleware", { enumerable: true, get: function () { return __importDefault(_404_1).default; } });
//# sourceMappingURL=index.js.map