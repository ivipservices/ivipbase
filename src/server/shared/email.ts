export interface EmailRequest {
	/** email request type */
	type: string;
}

export interface UserEmailRequest extends EmailRequest {
	user: { uid: string; email: string; username?: string; displayName?: string; settings?: any };
	ip: string;
	date: Date;
}

export interface UserSignupEmailRequest extends UserEmailRequest {
	type: "user_signup";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface UserSignInEmailRequest extends UserEmailRequest {
	type: "user_signin";
	activationCode: string;
	emailVerified: boolean;
	provider: string;
}

export interface UserResetPasswordEmailRequest extends UserEmailRequest {
	type: "user_reset_password";
	resetCode: string;
}

export interface UserResetPasswordSuccessEmailRequest extends UserEmailRequest {
	type: "user_reset_password_success";
}
