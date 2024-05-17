export interface IvipBaseEmailRequest {
    /** email request type */
    type: string;
}
export interface IvipBaseUserEmailRequest extends IvipBaseEmailRequest {
    user: {
        uid: string;
        email: string;
        username?: string;
        displayName?: string;
        settings?: any;
    };
    ip: string;
    date: Date;
}
export interface IvipBaseUserSignupEmailRequest extends IvipBaseUserEmailRequest {
    type: "user_signup";
    activationCode: string;
    emailVerified: boolean;
    provider: string;
}
export interface IvipBaseUserSignInEmailRequest extends IvipBaseUserEmailRequest {
    type: "user_signin";
    activationCode: string;
    emailVerified: boolean;
    provider: string;
}
export interface IvipBaseUserResetPasswordEmailRequest extends IvipBaseUserEmailRequest {
    type: "user_reset_password";
    resetCode: string;
}
export interface IvipBaseUserResetPasswordSuccessEmailRequest extends IvipBaseUserEmailRequest {
    type: "user_reset_password_success";
}
//# sourceMappingURL=email.d.ts.map