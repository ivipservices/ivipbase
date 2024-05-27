"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.WebSocketManager = void 0;
const ivipbase_core_1 = require("ivipbase-core");
class WebSocketManager extends ivipbase_core_1.SimpleEventEmitter {
    constructor(framework) {
        super();
        this.framework = framework;
    }
    on(event, callback) {
        return super.on(event, callback);
    }
    emit(event, data) {
        super.emit(event, data);
        return this;
    }
}
exports.WebSocketManager = WebSocketManager;
//# sourceMappingURL=manager.js.map