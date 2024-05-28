import { DataBase, DebugLogger, SimpleEventEmitter, Types } from "ivipbase-core";
import { DbUserAccountDetails } from "../../server/schema/user";
import { AuthAccessDefault } from "../../server/browser";
type PathRuleFunctionEnvironment = {
    now: number;
    auth: Pick<DbUserAccountDetails, "uid">;
    operation: string;
    context: any;
    vars: any;
    /**
     * Allows checking if a path exists
     * @example
     * await exists('./shared/' + auth.uid)
     */
    exists: (target: string) => Promise<boolean>;
    /**
     * Allows getting current values stored in the db
     * @example
     * await value('./writable') === true
     * @example
     * const current = await value('.');
     * return current.writable === true && current.owner === auth.uid;
     * @example
     * // Same as above, but only load `writable` and `owner` properties
     * const current = await value('.', ['writable', 'owner']);
     * return current.writable === true && current.owner === auth.uid;
     */
    value: (target: string, include?: string[]) => Promise<any>;
};
export type PathRuleReturnValue = boolean | undefined | "allow" | "deny" | "cascade";
export type PathRuleFunction = (env: PathRuleFunctionEnvironment) => PathRuleReturnValue | Promise<PathRuleReturnValue>;
type PathRule = boolean | string | PathRuleFunction;
type PathRules = {
    [path: string]: PathRules | PathRule | object | undefined;
    ".schema"?: string | object;
    ".read"?: PathRule;
    ".write"?: PathRule;
    ".query"?: PathRule;
    ".export"?: PathRule;
    ".reflect"?: PathRule;
    ".exists"?: PathRule;
    ".transact"?: PathRule;
    ".update"?: PathRule;
    ".set"?: PathRule;
    ".delete"?: PathRule;
    ".import"?: PathRule;
    ".validate"?: string | PathRuleFunction;
};
export type RulesData = {
    rules: PathRules;
};
export type RuleValidationFailCode = "rule" | "no_rule" | "private" | "exception";
export type HasAccessResult = {
    allow: boolean;
    code?: RuleValidationFailCode;
    message?: string;
    rule?: PathRule;
    rulePath?: string;
    details?: Error;
} & ({
    allow: true;
} | {
    allow: false;
    code: RuleValidationFailCode;
    message: string;
    rule?: PathRule;
    rulePath?: string;
    details?: Error;
});
export declare class AccessRuleValidationError extends Error {
    result: HasAccessResult;
    constructor(result: HasAccessResult);
}
export type AccessCheckOperation = "transact" | "get" | "update" | "set" | "delete" | "reflect" | "exists" | "query" | "import" | "export";
export type PathRuleType = "read" | "write" | "validate" | AccessCheckOperation;
export declare class PathBasedRules extends SimpleEventEmitter {
    readonly env: {
        debug: DebugLogger;
        db: DataBase;
        authEnabled: boolean;
        rules?: RulesData;
    };
    private authEnabled;
    private jsonRules;
    private accessRules;
    private db;
    private debug;
    private codeRules;
    stop(): void;
    constructor(defaultAccess: AuthAccessDefault, env: {
        debug: DebugLogger;
        db: DataBase;
        authEnabled: boolean;
        rules?: RulesData;
    });
    on<RulesData>(event: "changed", callback: (data: RulesData) => void): Types.SimpleEventEmitterProperty;
    emit(event: "changed", data: RulesData): this;
    applyRules(rules: RulesData, isInitial?: boolean): void;
    isOperationAllowed(user: Pick<DbUserAccountDetails, "uid" | "permission_level">, path: string, operation: AccessCheckOperation, data?: Record<string, any>): Promise<HasAccessResult>;
    add(rulePaths: string | string[], ruleTypes: PathRuleType | PathRuleType[], callback: PathRuleFunction): void;
}
export {};
//# sourceMappingURL=rules.d.ts.map