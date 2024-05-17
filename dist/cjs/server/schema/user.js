"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAccountDetails = void 0;
const getPublicAccountDetails = (account) => {
    var _a, _b, _c, _d, _e, _f, _g, _h, _j, _k;
    return {
        uid: account.uid,
        username: account.username,
        email: (_a = account.email) !== null && _a !== void 0 ? _a : "",
        displayName: account.display_name,
        photoURL: account.photoURL,
        emailVerified: (_b = account.email_verified) !== null && _b !== void 0 ? _b : false,
        created: (_c = account.created) === null || _c === void 0 ? void 0 : _c.toISOString(),
        prevSignin: ((_d = account.prev_signin) !== null && _d !== void 0 ? _d : new Date(0)).toISOString(),
        prevSigninIp: (_e = account.prev_signin_ip) !== null && _e !== void 0 ? _e : "",
        lastSignin: ((_f = account.last_signin) !== null && _f !== void 0 ? _f : new Date(0)).toISOString(),
        lastSigninIp: (_g = account.last_signin_ip) !== null && _g !== void 0 ? _g : "",
        changePassword: (_h = account.change_password) !== null && _h !== void 0 ? _h : false,
        changePasswordRequested: ((_j = account.change_password_requested) !== null && _j !== void 0 ? _j : new Date(0)).toISOString(),
        changePasswordBefore: ((_k = account.change_password_before) !== null && _k !== void 0 ? _k : new Date(0)).toISOString(),
        settings: account.settings,
    };
};
exports.getPublicAccountDetails = getPublicAccountDetails;
//# sourceMappingURL=user.js.map