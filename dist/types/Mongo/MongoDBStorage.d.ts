import { CustomStorageSettings, CustomStorageTransaction } from 'acebase';
import { Utils } from 'acebase-core';
import { NodeInfo } from 'acebase/dist/types/node-info';
import { Storage, StorageEnv } from 'acebase/dist/types/storage';
import { NodeAddress } from 'acebase/dist/types/node-address';
import { StorageNode } from '../lib/StorageNode';
export declare class CustomStorageNodeAddress {
    path: string;
    constructor(containerPath: string);
}
export declare class CustomStorageNodeInfo extends NodeInfo {
    address: NodeAddress;
    revision: string;
    revision_nr: number;
    created: Date;
    modified: Date;
    constructor(info: Omit<CustomStorageNodeInfo, 'valueType' | 'valueTypeName'>);
}
export declare class CustomStorage extends Storage {
    private _customImplementation;
    private _local_indexes;
    constructor(dbname: string, settings: CustomStorageSettings, env: StorageEnv);
    private _init;
    private throwImplementationError;
    private _storeNode;
    private _processReadNodeValue;
    private _readNode;
    private _getTypeFromStoredValue;
    /**
     * Creates or updates a node in its own record. DOES NOT CHECK if path exists in parent node, or if parent paths exist! Calling code needs to do this
     */
    protected _writeNode(path: string, value: any, options: {
        transaction: CustomStorageTransaction;
        /** @default false */
        merge?: boolean;
        revision?: string;
        currentValue?: any;
        diff?: Utils.TCompareResult;
    }): Promise<void>;
    /**
     * Deletes (dedicated) node and all subnodes without checking for existence. Use with care - all removed nodes will lose their revision stats! DOES NOT REMOVE INLINE CHILD NODES!
     */
    private _deleteNode;
    /**
     * Enumerates all children of a given Node for reflection purposes
     */
    getChildren(path: string, options?: {
        transaction?: CustomStorageTransaction;
        keyFilter?: string[] | number[];
    }): {
        /**
         *
         * @param valueCallback callback function to run for each child. Return false to stop iterating
         * @returns returns a promise that resolves with a boolean indicating if all children have been enumerated, or was canceled by the valueCallback function
         */
        next(valueCallback: (child: NodeInfo) => boolean | void | Promise<boolean | void>): Promise<boolean>;
    };
    getNode(path: string, options?: {
        include?: string[];
        exclude?: string[];
        /** @default true */
        child_objects?: boolean;
        transaction?: CustomStorageTransaction;
    }): Promise<StorageNode>;
    getNodeInfo(path: string, options?: {
        transaction?: CustomStorageTransaction;
        /** @default false */
        include_child_count?: boolean;
    }): Promise<CustomStorageNodeInfo>;
    setNode(path: string, value: any, options?: {
        assert_revision?: string;
        transaction?: CustomStorageTransaction;
        /** @default false */
        suppress_events?: boolean;
        context?: any;
    }): Promise<void>;
    updateNode(path: string, updates: any, options?: {
        transaction?: CustomStorageTransaction;
        /** @default false */
        suppress_events?: boolean;
        context?: any;
    }): Promise<void>;
}
//# sourceMappingURL=MongoDBStorage.d.ts.map