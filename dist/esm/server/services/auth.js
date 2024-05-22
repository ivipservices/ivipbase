import { SimpleCache } from "ivipbase-core";
import { randomBytes } from "crypto";
import { createPasswordHash, generatePassword, getOldPasswordHash, getPasswordHash } from "../shared/password.js";
export const setupAuthentication = async (env) => {
    // Setup auth cache
    env.authCache = new SimpleCache({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });
    // Obtenha ou gere um salt para hash de tokens públicos
    for (const dbName of env.dbNames) {
        env.db(dbName).ready(async () => {
            await env
                .securityRef(dbName)
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
                .authRef(dbName)
                .child("admin")
                .transaction((snap) => {
                let adminAccount = snap.val();
                if (adminAccount === null) {
                    // Use provided default password, or generate one:
                    const adminPassword = env.settings.auth.defaultAdminPassword || generatePassword();
                    const pwd = createPasswordHash(adminPassword);
                    adminAccount = {
                        username: "admin",
                        display_name: `[${dbName}] IvipBase admin`,
                        password: pwd.hash,
                        password_salt: pwd.salt,
                        change_password: true,
                        created: new Date(),
                        access_token: undefined,
                        settings: {},
                        permission_level: 2,
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
                }
                else if (env.settings.auth.defaultAdminPassword) {
                    // Check if the default password was changed
                    let passwordHash;
                    if (!adminAccount.password_salt) {
                        // Old md5 password hash?
                        passwordHash = getOldPasswordHash(env.settings.auth.defaultAdminPassword);
                    }
                    else {
                        passwordHash = getPasswordHash(env.settings.auth.defaultAdminPassword, adminAccount.password_salt);
                    }
                    if (adminAccount.password !== passwordHash) {
                        const pwd = createPasswordHash(env.settings.auth.defaultAdminPassword);
                        adminAccount.password = pwd.hash;
                        adminAccount.password_salt = pwd.salt;
                        return adminAccount; // Save it
                    }
                }
            });
        });
    }
};
//# sourceMappingURL=auth.js.map