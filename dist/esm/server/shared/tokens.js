import * as crypto from "crypto";
export const createPublicAccessToken = (database, uid, ip, dbToken, password) => {
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
    return "b" + createSignedPublicToken(obj, password);
};
export const decodePublicAccessToken = (accessToken, password) => {
    let details;
    if (accessToken[0] === "b") {
        // New signed version
        const obj = parseSignedPublicToken(accessToken.slice(1), password);
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
export const createSignedPublicToken = (obj, password) => {
    const str = JSON.stringify(obj);
    const checksum = getSignature(str, password);
    return Buffer.from(JSON.stringify({ v: 1, cs: checksum, d: str })).toString("base64");
};
/**
 * Analisa e valida um token assinado que foi previamente gerado por `createSignedPublicToken`
 * @param str token gerado anteriormente por `createSignedPublicToken`
 * @param password a mesma senha usada para criar o token
 * @returns o objeto de dados original
 */
export const parseSignedPublicToken = (str, password) => {
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
export const findValidPasswordByToken = (token, passwords) => {
    if (!token || !Array.isArray(passwords) || passwords.length === 0) {
        return;
    }
    for (let i = 0; i < passwords.length; i++) {
        try {
            const obj = decodePublicAccessToken(token, passwords[i]);
            if (typeof obj.access_token !== "string" || typeof obj.created !== "number" || typeof obj.database !== "string" || typeof obj.ip !== "string" || typeof obj.uid !== "string") {
                continue;
            }
            return passwords[i];
        }
        catch { }
    }
    return;
};
//# sourceMappingURL=tokens.js.map