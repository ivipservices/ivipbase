import { IPCPeer } from "./IPCPeer";

export const DEFAULT_ENTRY_NAME = "[DEFAULT]";

/**
 * @internal
 */
export const _ipcs = new Map<string, IPCPeer>();
