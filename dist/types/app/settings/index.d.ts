import { LocalServer, ServerInitialSettings, ServerSettings } from "../../server";
import { IvipBaseSettings as BrowserSettings, InitialServerEmailSettings, ServerEmailSettings as BrowserEmailSettings, EmailRequest } from "./browser";
import NodeMailer from "nodemailer";
declare class ServerEmailSettings extends BrowserEmailSettings {
    protected transporter: NodeMailer.Transporter;
    readonly prepareModel: (request: EmailRequest) => {
        title: string;
        subject: string;
        message: string;
    };
    constructor(options: InitialServerEmailSettings);
    /** Função a ser chamada quando um e-mail precisa ser enviado */
    send(request: EmailRequest): Promise<void>;
}
interface AppServerSettings {
    email: InitialServerEmailSettings;
}
export declare class IvipBaseSettings extends BrowserSettings {
    readonly isServer: boolean;
    readonly isValidClient: boolean;
    readonly server?: ServerSettings;
    /**
     * Configurações de e-mail que habilitam o iVipServer a enviar e-mails, por exemplo, para dar as boas-vindas a novos usuários, redefinir senhas, notificar sobre novos logins, etc.
     */
    readonly email?: ServerEmailSettings;
    constructor(options?: Partial<IvipBaseSettings & ServerInitialSettings<LocalServer> & AppServerSettings>);
}
export {};
//# sourceMappingURL=index.d.ts.map