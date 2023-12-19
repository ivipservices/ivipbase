export type ErrorMap<ErrorCode extends string> = {
    readonly [K in ErrorCode]: string;
};
export interface ErrorData {
    [key: string]: unknown;
}
export declare class MainError extends Error {
    /** O código de erro para este erro. */
    readonly code: string;
    /** Dados personalizados para este erro. */
    customData?: Record<string, unknown> | undefined;
    /** O nome personalizado para todos os iVipBaseError. */
    readonly name: string;
    constructor(
    /** O código de erro para este erro. */
    code: string, message: string, 
    /** Dados personalizados para este erro. */
    customData?: Record<string, unknown> | undefined);
}
export declare class ErrorFactory<ErrorCode extends string, ErrorParams extends {
    readonly [K in ErrorCode]?: ErrorData;
} = {}> {
    private readonly service;
    private readonly serviceName;
    private readonly errors;
    constructor(service: string, serviceName: string, errors: ErrorMap<ErrorCode>);
    create<K extends ErrorCode>(code: K, ...data: K extends keyof ErrorParams ? [ErrorParams[K]] : []): MainError;
}
//# sourceMappingURL=util.d.ts.map