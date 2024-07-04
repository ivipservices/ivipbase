import { LocalServer, ServerInitialSettings, ServerSettings } from "../../server";
import { IvipBaseSettings as BrowserSettings, InitialServerEmailSettings, ServerEmailSettings as BrowserEmailSettings, EmailRequest } from "./browser";
import NodeMailer from "nodemailer";
declare class ServerEmailSettings extends BrowserEmailSettings {
    protected transporter: NodeMailer.Transporter;
    readonly prepareModel: (request: EmailRequest) => {
        title: string;
        subject: string;
        message: string;
    } | undefined;
    constructor(options: InitialServerEmailSettings);
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    send(request: EmailRequest): Promise<void>;
}
interface AppServerSettings extends ServerInitialSettings<LocalServer> {
    email: InitialServerEmailSettings;
}
export type IvipBaseSettingsOptions = Partial<Omit<IvipBaseSettings, "email"> & ServerInitialSettings<LocalServer> & AppServerSettings>;
export declare class IvipBaseSettings extends BrowserSettings {
    readonly options: IvipBaseSettingsOptions;
    isServer: boolean;
    isValidClient: boolean;
    server?: ServerSettings;
    /**
     * Configurações de e-mail que habilitam o iVipServer a enviar e-mails, por exemplo, para dar as boas-vindas a novos usuários, redefinir senhas, notificar sobre novos logins, etc.
     */
    email?: ServerEmailSettings;
    constructor(options?: IvipBaseSettingsOptions);
    get isPossiplyServer(): boolean;
    reset(options?: IvipBaseSettingsOptions, forceSuper?: boolean): void;
}
export {};
//# sourceMappingURL=index.d.ts.map