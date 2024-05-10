import { SimpleCache } from "ivipbase-core";
import type { LocalServer } from "../../server";
import { randomBytes } from "crypto";
import { DbUserAccountDetails } from "../schema/user";
import { createPasswordHash, generatePassword, getOldPasswordHash, getPasswordHash } from "../shared/password";

export const setupAuthentication = async (env: LocalServer) => {
	// Setup auth cache
	env.authCache = new SimpleCache<string, DbUserAccountDetails>({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });

	// Obtenha ou gere um salt para hash de tokens públicos
	for (const dbName of env.dbNames) {
		env.db(dbName).ready(async () => {
			await env
				.db(dbName)
				.ref("__auth__/security")
				.child("token_salt")
				.transaction((snap) => {
					env.tokenSalt = snap.val();
					if (!env.tokenSalt) {
						const length = 256;
						env.tokenSalt = randomBytes(Math.ceil(length / 2))
							.toString("hex")
							.slice(0, length);
						return env.tokenSalt;
					}
				});

			// Setup admin account
			await env
				.db(dbName)
				.ref("__auth__/accounts")
				.child("admin")
				.transaction((snap) => {
					let adminAccount: DbUserAccountDetails | null = snap.val();
					if (adminAccount === null) {
						// Use provided default password, or generate one:
						const adminPassword = env.settings.auth.defaultAdminPassword || generatePassword();

						const pwd = createPasswordHash(adminPassword);
						adminAccount = {
							username: "admin",
							display_name: `[${dbName}] IvipBase admin`,
							password: pwd.hash,
							password_salt: pwd.salt,
							change_password: true, // flags that password must be changed. Not implemented yet
							created: new Date(),
							access_token: undefined, // Will be set upon login, so bearer authentication strategy can find user with this token
							settings: {},
						};
						env.debug.warn(`__________________________________________________________________`);
						env.debug.warn(``);
						env.debug.warn(`IMPORTANT: Admin account created`);
						env.debug.warn(`You need the admin account to remotely administer the database`);
						env.debug.warn(`Use the following credentials to authenticate an AceBaseClient:`);
						env.debug.warn(``);
						env.debug.warn(`    database: ${dbName}`);
						env.debug.warn(`    username: admin`);
						env.debug.warn(`    password: ${adminPassword}`);
						env.debug.warn(``);
						env.debug.warn(`THIS IS ONLY SHOWN ONCE!`);
						env.debug.warn(`__________________________________________________________________`);
						return adminAccount; // Save it
					} else if (env.settings.auth.defaultAdminPassword) {
						// Check if the default password was changed
						let passwordHash;
						if (!adminAccount.password_salt) {
							// Old md5 password hash?
							passwordHash = getOldPasswordHash(env.settings.auth.defaultAdminPassword);
						} else {
							passwordHash = getPasswordHash(env.settings.auth.defaultAdminPassword, adminAccount.password_salt);
						}
						if (adminAccount.password === passwordHash) {
							env.debug.warn(`WARNING: default password for admin user was not changed!`);

							if (!adminAccount.password_salt) {
								// Create new password hash
								const pwd = createPasswordHash(env.settings.auth.defaultAdminPassword);
								adminAccount.password = pwd.hash;
								adminAccount.password_salt = pwd.salt;
								return adminAccount; // Save it
							}
						}
					}
				});
		});
	}
};
