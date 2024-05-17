import type { RulesData } from "../../server/services/rules";
import { StorageSettings } from "../verifyStorage";
export interface EmailRequestType {
    /** email request type */
    type: string;
}
export interface UserEmailRequest extends EmailRequestType {
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
export type EmailRequest = UserSignupEmailRequest | UserSignInEmailRequest | UserResetPasswordEmailRequest | UserResetPasswordSuccessEmailRequest;
export interface ServerEmailServerSettings {
    /** É o nome do host ou endereço IP ao qual se conectar (o padrão é ‘localhost’) */
    host: string;
    /** É a porta à qual se conectar (o padrão é 587 se for seguro for falso ou 465 se for verdadeiro) */
    port: number;
    /** Indica o tipo de autenticação, o padrão é ‘login’, outra opção é ‘oauth2’ */
    type?: "login" | "oauth2";
    /** É o nome de usuário de login */
    user: string;
    /** É a senha do usuário se o login normal for usado */
    pass: string;
    /** Se for verdade, a conexão usará TLS ao conectar-se ao servidor. Se for falso (o padrão), então o TLS será usado se o servidor suportar a extensão STARTTLS. Na maioria dos casos, defina esse valor como verdadeiro se você estiver se conectando à porta 465. Para a porta 587 ou 25, mantenha-o falso */
    secure?: boolean;
}
export interface InitialServerEmailSettings {
    /** Use a propriedade "send" para a sua própria implementação */
    server: ServerEmailServerSettings;
    /** Função opcional para preparar o modelo de e-mail antes do envio. */
    prepareModel?: (request: EmailRequest) => {
        title: string;
        subject: string;
        message: string;
    };
}
export declare class ServerEmailSettings {
    readonly server: ServerEmailServerSettings;
    readonly prepareModel: (request: EmailRequest) => {
        title: string;
        subject: string;
        message: string;
    };
    constructor(options: InitialServerEmailSettings);
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    send(request: EmailRequest): Promise<void>;
}
export interface DatabaseSettings {
    name: string;
    description?: string;
    rulesData?: RulesData;
}
export declare class IvipBaseSettings {
    name: string;
    dbname: string | string[];
    database: DatabaseSettings | DatabaseSettings[];
    description: string;
    logLevel: "log" | "warn" | "error";
    storage: StorageSettings;
    protocol: "http" | "https";
    host: string;
    port?: number;
    isServer: boolean;
    isValidClient: boolean;
    bootable: boolean;
    constructor(options?: Partial<Omit<IvipBaseSettings, "isServer" | "isValidClient">>);
    reset(options?: Partial<Omit<IvipBaseSettings, "isServer" | "isValidClient">>): void;
}
//# sourceMappingURL=browser.d.ts.map