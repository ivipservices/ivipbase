import { SimpleEventEmitter } from "ivipbase-core";
export class WebSocketManager extends SimpleEventEmitter {
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
//# sourceMappingURL=manager.js.map