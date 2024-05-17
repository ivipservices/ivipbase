import { PathInfo } from "ivipbase-core";
import { getValueTypeName } from "./utils.js";
export class NodeAddress {
    constructor(path) {
        this.path = path;
    }
    toString() {
        return `"/${this.path}"`;
    }
    /**
     * Compares this address to another address
     */
    equals(address) {
        return PathInfo.get(this.path).equals(address.path);
    }
}
export class NodeInfo {
    constructor(info) {
        this.path = info.path;
        this.type = info.type;
        this.index = info.index;
        this.key = info.key;
        this.exists = info.exists;
        this.address = info.address;
        this.value = info.value;
        this.childCount = info.childCount;
        if (typeof this.path === "string" && typeof this.key === "undefined" && typeof this.index === "undefined") {
            const pathInfo = PathInfo.get(this.path);
            if (typeof pathInfo.key === "number") {
                this.index = pathInfo.key;
            }
            else {
                this.key = pathInfo.key;
            }
        }
        if (typeof this.exists === "undefined") {
            this.exists = true;
        }
    }
    get valueType() {
        return this.type ?? -1;
    }
    get valueTypeName() {
        return getValueTypeName(this.valueType);
    }
    toString() {
        if (!this.exists) {
            return `"${this.path}" doesn't exist`;
        }
        if (this.address) {
            return `"${this.path}" is ${this.valueTypeName} stored at ${this.address.toString()}`;
        }
        else {
            return `"${this.path}" is ${this.valueTypeName} with value ${this.value}`;
        }
    }
}
export class CustomStorageNodeInfo extends NodeInfo {
    constructor(info) {
        super(info);
        this.revision = info.revision;
        this.revision_nr = info.revision_nr;
        this.created = info.created;
        this.modified = info.modified;
    }
}
//# sourceMappingURL=NodeInfo.js.map