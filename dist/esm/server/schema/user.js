import { isDate } from "../../utils/index.js";
export const getPublicAccountDetails = (account) => {
    return {
        uid: account.uid,
        username: account.username,
        email: account.email ?? "",
        displayName: account.display_name,
        photoURL: account.photoURL,
        emailVerified: account.email_verified ?? false,
        created: account.created?.toISOString(),
        prevSignin: (isDate(account.prev_signin) ? account.prev_signin : new Date(0)).toISOString(),
        prevSigninIp: account.prev_signin_ip ?? "",
        lastSignin: (isDate(account.last_signin) ? account.last_signin : new Date(0)).toISOString(),
        lastSigninIp: account.last_signin_ip ?? "",
        changePassword: account.change_password ?? false,
        changePasswordRequested: (isDate(account.change_password_requested) ? account.change_password_requested : new Date(0)).toISOString(),
        changePasswordBefore: (isDate(account.change_password_before) ? account.change_password_before : new Date(0)).toISOString(),
        settings: account.settings,
    };
};
//# sourceMappingURL=user.js.map