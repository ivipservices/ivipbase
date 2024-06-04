"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.setupAuthentication = void 0;
const ivipbase_core_1 = require("ivipbase-core");
const crypto_1 = require("crypto");
const password_1 = require("../shared/password");
const setupAuthentication = async (env) => {
    // Setup auth cache
    env.authCache = new ivipbase_core_1.SimpleCache({ expirySeconds: 300, cloneValues: false, maxEntries: 1000 });
    // Obtenha ou gere um salt para hash de tokens públicos
    for (const dbName of env.dbNames) {
        env.db(dbName).ready(async () => {
            await env
                .securityRef(dbName)
                .child("token_salt")
                .transaction((snap) => {
                env.tokenSalt[dbName] = snap.val();
                if (!env.tokenSalt[dbName]) {
                    const length = 256;
                    env.tokenSalt[dbName] = (0, crypto_1.randomBytes)(Math.ceil(length / 2))
                        .toString("hex")
                        .slice(0, length);
                    return env.tokenSalt[dbName];
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
                    const adminPassword = env.settings.dbAuth[dbName].defaultAdminPassword || (0, password_1.generatePassword)();
                    const pwd = (0, password_1.createPasswordHash)(adminPassword);
                    adminAccount = {
                        username: "admin",
                        display_name: `[${dbName}] IvipBase admin`,
                        password: pwd.hash,
                        password_salt: pwd.salt,
                        change_password: true, // flags that password must be changed. Not implemented yet
                        created: new Date(),
                        access_token: undefined, // Will be set upon login, so bearer authentication strategy can find user with this token
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
                else if (env.settings.dbAuth[dbName].defaultAdminPassword) {
                    // Check if the default password was changed
                    let passwordHash;
                    if (!adminAccount.password_salt) {
                        // Old md5 password hash?
                        passwordHash = (0, password_1.getOldPasswordHash)(env.settings.dbAuth[dbName].defaultAdminPassword);
                    }
                    else {
                        passwordHash = (0, password_1.getPasswordHash)(env.settings.dbAuth[dbName].defaultAdminPassword, adminAccount.password_salt);
                    }
                    if (adminAccount.password !== passwordHash) {
                        const pwd = (0, password_1.createPasswordHash)(env.settings.dbAuth[dbName].defaultAdminPassword);
                        adminAccount.password = pwd.hash;
                        adminAccount.password_salt = pwd.salt;
                        return adminAccount; // Save it
                    }
                }
            });
        });
    }
};
exports.setupAuthentication = setupAuthentication;
//# sourceMappingURL=auth.js.map