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
exports.parseSignedPublicToken = exports.createSignedPublicToken = exports.decodePublicAccessToken = exports.createPublicAccessToken = void 0;
const crypto = __importStar(require("crypto"));
const createPublicAccessToken = (database, uid, ip, dbToken, password) => {
    const obj = {
        t: dbToken,
        d: database,
        c: Date.now(),
        u: uid,
        i: ip,
    };
    // let str = JSON.stringify(obj);
    // str = Buffer.from(str).toString('base64');
    // return 'a' + str; // version a
    return "b" + (0, exports.createSignedPublicToken)(obj, password);
};
exports.createPublicAccessToken = createPublicAccessToken;
const decodePublicAccessToken = (accessToken, password) => {
    let details;
    if (accessToken[0] === "b") {
        // New signed version
        const obj = (0, exports.parseSignedPublicToken)(accessToken.slice(1), password);
        details = {
            access_token: obj.t,
            database: obj.d,
            uid: obj.u,
            created: obj.c,
            ip: obj.i,
        };
    }
    else if (accessToken[0] === "a") {
        // Versão antiga e insegura, anteriormente permitida até 1º de agosto de 2020.
        throw new Error("Old token version not allowed");
    }
    if (!details || !details.access_token || !details.uid || !details.created || !details.ip) {
        throw new Error("Invalid token");
    }
    return details;
};
exports.decodePublicAccessToken = decodePublicAccessToken;
const getSignature = (content, salt) => {
    // Use md5 rápido com salt para assinar. Um salt grande é recomendado!!
    return crypto
        .createHash("md5")
        .update(salt + content)
        .digest("hex");
};
/**
 * Assina objetos com um hash md5. Um invasor pode decodificá-lo em base64 e ver o conteúdo e o hash de verificação gerado,
 * mas precisará adivinhar a senha usada para gerar o hash para manipulá-lo. Isso não é impossível, mas levará
 * um tempo muito longo ao usar uma senha grande
 * @param obj objeto de dados a ser assinado
 * @param password senha a ser usada como salt para o hash md5 gerado
 * @returns token assinado codificado em base64
 */
const createSignedPublicToken = (obj, password) => {
    const str = JSON.stringify(obj);
    const checksum = getSignature(str, password);
    return Buffer.from(JSON.stringify({ v: 1, cs: checksum, d: str })).toString("base64");
};
exports.createSignedPublicToken = createSignedPublicToken;
/**
 * Analisa e valida um token assinado que foi previamente gerado por `createSignedPublicToken`
 * @param str token gerado anteriormente por `createSignedPublicToken`
 * @param password a mesma senha usada para criar o token
 * @returns o objeto de dados original
 */
const parseSignedPublicToken = (str, password) => {
    const json = Buffer.from(str, "base64").toString("utf8");
    const obj = JSON.parse(json);
    if (obj.v !== 1) {
        throw new Error(`Unsupported version`);
    }
    if (typeof obj.cs !== "string" || typeof obj.d !== "string") {
        throw new Error("Invalid token");
    }
    const checksum = obj.cs;
    if (checksum !== getSignature(obj.d, password)) {
        throw new Error(`compromised object`);
    }
    return JSON.parse(obj.d);
};
exports.parseSignedPublicToken = parseSignedPublicToken;
//# sourceMappingURL=tokens.js.map