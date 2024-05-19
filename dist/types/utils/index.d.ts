export * from "./base64";
/**
 * Substituição para console.assert, lança um erro se a condição não for atendida.
 * @param condition Condição 'truthy'
 * @param error Mensagem de erro opcional
 */
export declare function assert(condition: any, error?: string): void;
export declare function pathValueToObject(dataPath: string, currentPath: string, value: any): typeof value;
export declare function removeNulls(obj: any): any;
export declare function joinObjects(obj1: any, ...objs: any[]): any;
export declare function replaceUndefined(obj: any): any;
export declare function sanitizeEmailPrefix(email: string): string;
//# sourceMappingURL=index.d.ts.map