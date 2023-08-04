import { RouteInitEnvironment } from "../../types";
export declare const addAuthenticionRoutes: (env: RouteInitEnvironment) => Promise<{
    verifyEmailAddress: (clientIp: string, code: string) => Promise<void>;
    resetPassword: (clientIp: string, code: string, newPassword: string) => Promise<import("../../Schema/user").DbUserAccountDetails>;
}>;
export default addAuthenticionRoutes;
//# sourceMappingURL=index.d.ts.map