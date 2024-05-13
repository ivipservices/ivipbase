export interface UserProfilePicture {
	width?: number;
	height?: number;
	url: string;
}

export interface UserSettings {
	[key: string]: string | number | boolean;
}

export type iVipBaseUser = ({ username: "admin" } | { uid: string; username: string } | { uid: string; email: string }) & {
	uid?: string;
	displayName?: string;
	picture?: UserProfilePicture;
	emailVerified: boolean;
	/** ISO date string */
	created: string;
	/** ISO date string */
	prevSignin: string;
	prevSigninIp: string;
	/** ISO date string */
	lastSignin: string;
	lastSigninIp: string;
	changePassword: boolean;
	/** ISO date string */
	changePasswordRequested: string;
	/** ISO date string */
	changePasswordBefore: string;
	settings: UserSettings;
};

export type DbUserAccountDetails = ({ username: "admin" } | { uid: string; username: string } | { uid: string; email: string }) & {
	/** uid, not stored in the database object (uid is the node's key) */
	uid?: string;
	username?: string;
	email?: string;
	/** If the supplied email address has been verified */
	email_verified?: boolean;
	/** If the account has been disabled */
	is_disabled?: boolean;
	/** User's (public) display name */
	display_name?: string;
	/** Optional profile picture */
	picture?: UserProfilePicture;
	/** Password hash */
	password: string;
	/** Random password salt (base64 encoded) used to generate the password hash */
	password_salt: string;
	/** Code that allows a user to reset their password */
	password_reset_code?: string;
	/** TODO: Whether the user has to change their password */
	change_password?: boolean;
	/** TODO: Date/time the password change was requested */
	change_password_requested?: Date;
	/** TODO: Date/time the user must have changed their password */
	change_password_before?: Date;
	/** Date/time the account was created */
	created: Date;
	/** Creation IP address */
	created_ip?: string;
	/** Date/time of the last sign-in */
	last_signin?: Date;
	/** IP address of the last sign-in */
	last_signin_ip?: string;
	/** Date/time of the previous sign-in */
	prev_signin?: Date;
	/** IP address of the previous sign-in */
	prev_signin_ip?: string;
	/** Date/time the user last signed out */
	last_signout?: Date;
	/** IP address of the last sign-out */
	last_signout_ip?: string;
	/** Access token that allows access after signing in */
	access_token?: string;
	/** Date/time the access token was generated */
	access_token_created?: Date;
	/** Additional settings for this user */
	settings: UserSettings;
	/** Nível do usuário como admin */
	admin_level: "root" | "basic" | "denied";
};

export const getPublicAccountDetails = (account: DbUserAccountDetails): iVipBaseUser => {
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
	} as any;
};
