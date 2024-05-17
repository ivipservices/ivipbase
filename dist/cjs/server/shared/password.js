"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getOldPasswordHash = exports.getPasswordHash = exports.createPasswordHash = exports.generatePassword = void 0;
const crypto = __importStar(require("crypto"));
const generatePassword = () => {
    return Array.prototype.reduce.call("abcedefghijkmnopqrstuvwxyzABCDEFGHIJKLMNPQRSTUVWXYZ012345789!@#$%&", (password, c, i, chars) => {
        if (i > 15) {
            return password;
        }
        return password + chars[Math.floor(Math.random() * chars.length)];
    }, "");
};
exports.generatePassword = generatePassword;
/**
 * Generates a random salt and hashes the provided password with it. The resulting salt and hash should be stored in the database
 * @param password password to hash
 */
const createPasswordHash = (password) => {
    const length = 16;
    const salt = crypto
        .randomBytes(Math.ceil(length / 2))
        .toString("hex")
        .slice(0, length);
    const hash = crypto.createHmac("sha512", salt).update(password).digest("hex");
    return {
        salt,
        hash,
    };
};
exports.createPasswordHash = createPasswordHash;
/**
 * For checking passwords: uses given password and salt to get the hash that can be compared to a stored version.
 * @param password A password prodived by the user trying to sign in
 * @param salt the salt used to generate the hash, must be stored with the hash in the database
 */
const getPasswordHash = (password, salt) => {
    return crypto.createHmac("sha512", salt).update(password).digest("hex");
};
exports.getPasswordHash = getPasswordHash;
/**
 * Backward compatibility with old saltless md5 passwords. Becomes obsolete once all passwords have been updated (probably already so)
 */
const getOldPasswordHash = (password) => {
    // Backward compatibility with old saltless md5 passwords.
    // Becomes obsolete once all passwords have been updated
    return crypto.createHash("md5").update(password).digest("hex");
};
exports.getOldPasswordHash = getOldPasswordHash;
//# sourceMappingURL=password.js.map