export declare const createPublicAccessToken: (database: string, uid: string, ip: string, dbToken: string, password: string) => string;
export type PublicAccessToken = {
    access_token: string;
    database: string;
    uid: string;
    created: number;
    ip: string;
};
export declare const decodePublicAccessToken: (accessToken: string, password: string) => PublicAccessToken;
/**
 * Assina objetos com um hash md5. Um invasor pode decodificá-lo em base64 e ver o conteúdo e o hash de verificação gerado,
 * mas precisará adivinhar a senha usada para gerar o hash para manipulá-lo. Isso não é impossível, mas levará
 * um tempo muito longo ao usar uma senha grande
 * @param obj objeto de dados a ser assinado
 * @param password senha a ser usada como salt para o hash md5 gerado
 * @returns token assinado codificado em base64
 */
export declare const createSignedPublicToken: (obj: any, password: string) => string;
/**
 * Analisa e valida um token assinado que foi previamente gerado por `createSignedPublicToken`
 * @param str token gerado anteriormente por `createSignedPublicToken`
 * @param password a mesma senha usada para criar o token
 * @returns o objeto de dados original
 */
export declare const parseSignedPublicToken: (str: string, password: string) => any;
//# sourceMappingURL=tokens.d.ts.map