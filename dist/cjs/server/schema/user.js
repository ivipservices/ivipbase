"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.getPublicAccountDetails = void 0;
const utils_1 = require("../../utils");
const getPublicAccountDetails = (account) => {
    var _a, _b, _c, _d, _e, _f;
    return {
        uid: account.uid,
        username: account.username,
        email: (_a = account.email) !== null && _a !== void 0 ? _a : "",
        displayName: account.display_name,
        photoURL: account.photoURL,
        emailVerified: (_b = account.email_verified) !== null && _b !== void 0 ? _b : false,
        created: (_c = account.created) === null || _c === void 0 ? void 0 : _c.toISOString(),
        prevSignin: ((0, utils_1.isDate)(account.prev_signin) ? account.prev_signin : new Date(0)).toISOString(),
        prevSigninIp: (_d = account.prev_signin_ip) !== null && _d !== void 0 ? _d : "",
        lastSignin: ((0, utils_1.isDate)(account.last_signin) ? account.last_signin : new Date(0)).toISOString(),
        lastSigninIp: (_e = account.last_signin_ip) !== null && _e !== void 0 ? _e : "",
        changePassword: (_f = account.change_password) !== null && _f !== void 0 ? _f : false,
        changePasswordRequested: ((0, utils_1.isDate)(account.change_password_requested) ? account.change_password_requested : new Date(0)).toISOString(),
        changePasswordBefore: ((0, utils_1.isDate)(account.change_password_before) ? account.change_password_before : new Date(0)).toISOString(),
        settings: account.settings,
    };
};
exports.getPublicAccountDetails = getPublicAccountDetails;
//# sourceMappingURL=user.js.map