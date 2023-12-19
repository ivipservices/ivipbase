export const getPublicAccountDetails = (account) => {
    return {
        uid: account.uid,
        username: account.username,
        email: account.email ?? "",
        displayName: account.display_name,
        picture: account.picture,
        emailVerified: account.email_verified ?? false,
        created: account.created?.toISOString(),
        prevSignin: (account.prev_signin ?? new Date(0)).toISOString(),
        prevSigninIp: account.prev_signin_ip ?? "",
        lastSignin: (account.last_signin ?? new Date(0)).toISOString(),
        lastSigninIp: account.last_signin_ip ?? "",
        changePassword: account.change_password ?? false,
        changePasswordRequested: (account.change_password_requested ?? new Date(0)).toISOString(),
        changePasswordBefore: (account.change_password_before ?? new Date(0)).toISOString(),
        settings: account.settings,
    };
};
//# sourceMappingURL=user.js.map