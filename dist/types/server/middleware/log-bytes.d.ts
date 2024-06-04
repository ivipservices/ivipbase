import { LocalServer } from "..";
export declare const addMiddleware: (env: LocalServer) => () => Promise<{
    [dbName: string]: {
        request: number;
        response: number;
    };
}>;
export default addMiddleware;
//# sourceMappingURL=log-bytes.d.ts.map