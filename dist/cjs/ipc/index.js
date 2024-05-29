"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getIPCPeer = exports.IPCPeer = void 0;
const IPCPeer_1 = require("./IPCPeer");
Object.defineProperty(exports, "IPCPeer", { enumerable: true, get: function () { return IPCPeer_1.IPCPeer; } });
const internal_1 = require("./internal");
function getIPCPeer(name = internal_1.DEFAULT_ENTRY_NAME) {
    if (internal_1._ipcs.has(name)) {
        return internal_1._ipcs.get(name);
    }
    const ipc = new IPCPeer_1.IPCPeer(name);
    internal_1._ipcs.set(name, ipc);
    return ipc;
}
exports.getIPCPeer = getIPCPeer;
//# sourceMappingURL=index.js.map