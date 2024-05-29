import { IPCPeer } from "./IPCPeer/index.js";
import { DEFAULT_ENTRY_NAME, _ipcs } from "./internal.js";
export { IPCPeer };
export function getIPCPeer(name = DEFAULT_ENTRY_NAME) {
    if (_ipcs.has(name)) {
        return _ipcs.get(name);
    }
    const ipc = new IPCPeer(name);
    _ipcs.set(name, ipc);
    return ipc;
}
//# sourceMappingURL=index.js.map