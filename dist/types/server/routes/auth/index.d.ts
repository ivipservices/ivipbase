import type { LocalServer } from "../../";
export declare const addAuthenticionRoutes: (env: LocalServer) => {
    verifyEmailAddress: (dbName: string, clientIp: string, code: string) => Promise<string>;
    resetPassword: (dbName: string, clientIp: string, code: string, newPassword: string) => Promise<import("../../schema/user").DbUserAccountDetails>;
};
export default addAuthenticionRoutes;
//# sourceMappingURL=index.d.ts.map