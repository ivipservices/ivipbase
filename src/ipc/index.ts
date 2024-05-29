import { IPCPeer } from "./IPCPeer";
import { DEFAULT_ENTRY_NAME, _ipcs } from "./internal";

export { IPCPeer };

export function getIPCPeer(): IPCPeer;
export function getIPCPeer(name: string): IPCPeer;
export function getIPCPeer(name: string = DEFAULT_ENTRY_NAME) {
	if (_ipcs.has(name)) {
		return _ipcs.get(name);
	}

	const ipc = new IPCPeer(name);
	_ipcs.set(name, ipc);
	return ipc;
}
