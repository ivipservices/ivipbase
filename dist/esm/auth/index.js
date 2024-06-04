import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app/index.js";
import { hasDatabase } from "../database/index.js";
import { SimpleEventEmitter } from "ivipbase-core";
import localStorage from "../utils/localStorage/index.js";
import { sanitizeEmailPrefix } from "../utils/index.js";
import Base64 from "../utils/base64/index.js";
const AUTH_USER_LOGIN_ERROR_MESSAGE = "auth/login-failed";
export class AuthUser {
    constructor(auth, user, access_token = undefined) {
        this.auth = auth;
        /**
         * Whether the user's email address has been verified
         */
        this.emailVerified = false;
        /**
         * Whether the user has to change their password
         */
        this.changePassword = false;
        this._lastAccessTokenRefresh = 0;
        Object.assign(this, user);
        if (!user.uid) {
            throw new Error("User details is missing required uid field");
        }
        this.uid = user.uid;
        this.displayName = user.displayName ?? "unknown";
        this.created = user.created ?? new Date(0).toISOString();
        this.settings = user.settings ?? {};
        this._accessToken = access_token;
        this._lastAccessTokenRefresh = 0;
    }
    get accessToken() {
        return this._accessToken;
    }
    get providerData() {
        return [];
    }
    /**
     * Atualiza os dados do perfil de um usuário.
     * @param profile O displayName e o photoURL do perfil para atualizar.
     * @returns Uma promise que é resolvida quando a atualização for concluída.
     * @throws auth/invalid-display-name Lançado se o nome de exibição for inválido.
     * @throws auth/invalid-photo-url Lançado se a URL da foto for inválida.
     */
    async updateProfile(profile) {
        const result = await this.auth.app.request({ method: "POST", route: `/auth/${this.auth.database}/update`, data: profile });
        Object.assign(this, result.user ?? {});
    }
    /**
     * Atualiza o endereço de e-mail do usuário.
     * @param email O novo endereço de e-mail do usuário.
     * @returns Uma promise que é resolvida se o novo e-mail for válido e atualizado com sucesso no banco de dados do usuário.
     * @throws auth/email-already-in-use Lançado se o e-mail já estiver em uso por outro usuário.
     * @throws auth/invalid-email Lançado se o e-mail não for válido.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updateEmail(email) {
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                email,
            },
        });
        Object.assign(this, result.user ?? {});
    }
    /**
     * Atualiza o nome de usuário do usuário.
     * @param username O novo nome de usuário do usuário.
     * @returns Uma promise que é resolvida se o novo nome de usuário for válido e atualizado com sucesso no banco de dados do usuário.
     * @throws auth/username-already-in-use Lançado se o nome de usuário já estiver em uso por outro usuário.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updateUsername(username) {
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                username,
            },
        });
        Object.assign(this, result.user ?? {});
    }
    /**
     * Atualiza a senha do usuário.
     * @param currentPassword A senha atual do usuário.
     * @param newPassword A nova senha do usuário.
     * @returns Uma promise que é resolvida se a nova senha for válida e atualizada com sucesso no banco de dados do usuário.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async updatePassword(currentPassword, newPassword) {
        if (!this.accessToken) {
            throw new Error(`auth/requires-recent-login`);
        }
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/change_password`,
            data: { uid: this.uid, password: currentPassword, new_password: newPassword },
        });
        this._accessToken = result.access_token;
        this._lastAccessTokenRefresh = Date.now();
        this.auth.emit("signin", this);
    }
    /**
     * Envia um e-mail de verificação para um usuário.
     * @returns Uma promise que é resolvida quando o e-mail for enviado.
     * @throws auth/missing-android-pkg-name Lançado se o nome do pacote Android estiver ausente quando o aplicativo Android for necessário.
     * @throws auth/missing-continue-uri Lançado se a URL de continuação estiver ausente quando o widget da web for necessário.
     * @throws auth/missing-ios-bundle-id Lançado se o ID do pacote iOS estiver ausente quando o aplicativo iOS for necessário.
     * @throws auth/invalid-continue-uri Lançado se a URL de continuação for inválida.
     * @throws auth/unauthorized-continue-uri Lançado se o domínio da URL de continuação não estiver na lista de permissões. Coloque o domínio na lista de permissões no console do Firebase.
     */
    async sendEmailVerification() {
        if (!this.accessToken) {
            throw new Error(`auth/requires-recent-login`);
        }
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/send_email_verification`,
            data: { username: this.username, email: this.email },
        });
    }
    /**
     * Exclui a conta do usuário (também desconecta o usuário)
     * @returns Uma promise que é resolvida quando a conta do usuário for excluída
     * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async delete() {
        const result = await this.auth.app.request({ method: "POST", route: `/auth/${this.auth.database}/delete`, data: { uid: this.uid } });
        if (result) {
            const access_token = this._accessToken;
            this._accessToken = undefined;
            this._lastAccessTokenRefresh = 0;
            this.auth.emit("signout", access_token);
        }
    }
    /**
     * Retorna um JSON Web Token (JWT) usado para identificar o usuário a um serviço Firebase.
     * @param forceRefresh Indica se deve ou não forçar a atualização do token
     * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
     */
    async getIdToken(forceRefresh) {
        const now = Date.now();
        forceRefresh = forceRefresh || now - this._lastAccessTokenRefresh > 1000 * 60 * 15; // 15 minutes
        if (this._accessToken && forceRefresh) {
            this._lastAccessTokenRefresh = Date.now();
            try {
                const result = await this.auth.app.request({
                    method: "POST",
                    route: `/auth/${this.auth.database}/signin`,
                    data: { method: "token", access_token: this._accessToken, client_id: this.auth.app.socket && this.auth.app.socket.id },
                });
                Object.assign(this, result.user ?? {});
                this._accessToken = result.access_token;
                this.auth.emit("signin", this);
            }
            catch {
                this._lastAccessTokenRefresh = 0;
                const access_token = this._accessToken;
                this._accessToken = undefined;
                this.auth.emit("signout", access_token);
                throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
            }
        }
        return Promise.resolve(this._accessToken ?? "");
    }
    /**
     * Retorna um JSON Web Token (JWT) desserializado usado para identificar o usuário a um serviço Firebase.
     * @param forceRefresh Indica se deve ou não forçar a atualização do token
     * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
     */
    getIdTokenResult(forceRefresh) {
        throw new Error("Method not implemented.");
    }
    /**
     * Atualiza o usuário atual, se estiver conectado.
     * @returns Uma promise que é resolvida com o usuário atual após uma possível atualização do token.
     */
    async reload(forceRefresh = true) {
        if (!this._accessToken) {
            throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
        }
        await this.getIdToken(forceRefresh);
    }
    /**
     * Retorna uma representação JSON serializável deste objeto.
     * @returns Uma representação JSON serializável deste objeto.
     */
    toJSON() {
        return {
            uid: this.uid,
            username: this.username,
            email: this.email,
            displayName: this.displayName,
            photoURL: this.photoURL,
            emailVerified: this.emailVerified,
            created: this.created,
            prevSignin: this.prevSignin,
            prevSigninIp: this.prevSigninIp,
            lastSignin: this.lastSignin,
            lastSigninIp: this.lastSigninIp,
            changePassword: this.changePassword,
            changePasswordRequested: this.changePasswordRequested,
            changePasswordBefore: this.changePasswordBefore,
            settings: this.settings,
            accessToken: this.accessToken,
            providerData: this.providerData ?? [],
        };
    }
    /**
     * Cria uma instância de AuthUser a partir de um objeto JSON.
     * @param auth Uma instância de Auth.
     * @param json Um objeto JSON representando um usuário.
     * @returns Uma instância de AuthUser criada a partir do objeto JSON.
     */
    static fromJSON(auth, json) {
        const { accessToken, providerData, ...userInfo } = json;
        return new AuthUser(auth, userInfo, accessToken);
    }
}
export class Auth extends SimpleEventEmitter {
    constructor(database, app) {
        super();
        this.database = database;
        this.app = app;
        this._ready = false;
        /**
         * Currently signed in user
         */
        this._user = null;
        this.isValidAuth = app.isServer || !app.settings.isValidClient ? false : true;
        this.on("ready", () => {
            this._ready = true;
        });
        this.on("signin", (user) => {
            try {
                if (user) {
                    this._user = user;
                    localStorage.setItem(`[${this.database}][auth_user]`, Base64.encode(JSON.stringify(user.toJSON())));
                }
                else {
                    this._user = null;
                    localStorage.removeItem(`[${this.database}][auth_user]`);
                }
            }
            catch {
                this._user = null;
                localStorage.removeItem(`[${this.database}][auth_user]`);
            }
            if (!this._ready) {
                this.emit("ready");
            }
            this.app.socket?.emit("signin", { dbName: this.database, accessToken: user.accessToken });
        });
        this.on("signout", (accessToken) => {
            this._user = null;
            localStorage.removeItem(`[${this.database}][auth_user]`);
            if (!this._ready) {
                this.emit("ready");
            }
            if (accessToken) {
                this.app.socket?.emit("signout", { dbName: this.database, accessToken });
            }
        });
        this.initialize();
    }
    async initialize() {
        this._ready = false;
        this.app.onConnect(async (socket) => {
            try {
                if (!this._user) {
                    const user = localStorage.getItem(`[${this.database}][auth_user]`);
                    if (user) {
                        this._user = AuthUser.fromJSON(this, JSON.parse(Base64.decode(user)));
                        await this._user.reload(false);
                    }
                    else if (!this._ready) {
                        this.emit("ready");
                    }
                }
                if (this._user?.accessToken && socket) {
                    socket.emit("signin", { dbName: this.database, accessToken: this._user.accessToken });
                }
            }
            catch {
                this._user = null;
                localStorage.removeItem(`[${this.database}][auth_user]`);
                if (!this._ready) {
                    this.emit("ready");
                }
            }
        }, true);
    }
    /**
     * Aguarda até que o módulo Auth esteja pronto.
     * @param callback Uma função de retorno de chamada que será chamada quando o módulo Auth estiver pronto.
     * @returns Uma promise que é resolvida quando o módulo Auth estiver pronto.
     */
    async ready(callback) {
        if (!this._ready) {
            // Aguarda o evento ready
            await new Promise((resolve) => this.once("ready", resolve));
        }
        callback?.(this._user);
    }
    get user() {
        return this._user;
    }
    set user(value) {
        try {
            if (value) {
                localStorage.setItem(`[${this.database}][auth_user]`, Base64.encode(JSON.stringify(value.toJSON())));
            }
            else {
                localStorage.removeItem(`[${this.database}][auth_user]`);
            }
        }
        catch { }
        this._user = value;
    }
    get currentUser() {
        return this.user;
    }
    handleSignInResult(result, emitEvent = true) {
        if (!result || !result.user || !result.access_token) {
            this.user = null;
            this.emit("signout");
            throw new Error("auth/user-not-found");
        }
        const user = new AuthUser(this, result.user, result.access_token);
        this.user = user;
        const details = { user: user, accessToken: result.access_token, provider: result.provider };
        emitEvent && this.emit("signin", details.user);
        return this.user;
    }
    /**
     * Cria uma nova conta de usuário associada ao endereço de e-mail e senha especificados.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha escolhida pelo usuário.
     * @param signIn Se deve ou não fazer login após a criação do usuário
     * @returns Uma promise que é resolvida com as informações do novo usuário criado.
     * @throws auth/email-already-in-use Lançado se já existir uma conta com o endereço de e-mail fornecido.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de e-mail/senha não estiverem habilitadas. Habilite contas de e-mail/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     */
    async createUserWithEmailAndPassword(email, password, signIn = true) {
        const result = await this.app.request({
            method: "POST",
            route: `/auth/${this.database}/signup`,
            data: {
                username: sanitizeEmailPrefix(email),
                email,
                password,
                displayName: email,
                display_name: email,
                settings: {},
            },
        });
        if (signIn) {
            return this.handleSignInResult(result);
        }
        return new AuthUser(this, result.user, result.access_token);
    }
    /**
     * Cria uma nova conta de usuário associada ao nome de usuário e senha especificados.
     * @param username O nome de usuário do usuário.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha escolhida pelo usuário.
     * @param signIn Se deve ou não fazer login após a criação do usuário
     * @returns Uma promise que é resolvida com as informações do novo usuário criado.
     * @throws auth/email-already-in-use Lançado se já existir uma conta com o endereço de e-mail fornecido.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de e-mail/senha não estiverem habilitadas. Habilite contas de e-mail/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
     * @throws auth/username-already-in-use Lançado se já existir uma conta com o nome de usuário fornecido.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/operation-not-allowed Lançado se contas de nome de usuário/senha não estiverem habilitadas. Habilite contas de nome de usuário/senha no Console do Firebase, na aba Auth.
     * @throws auth/weak-username Lançado se o nome de usuário não for forte o suficiente.
     * @throws auth/username-not-allowed Lançado se o nome de usuário não for permitido.
     * @throws auth/username-not-found Lançado se não houver usuário correspondente ao nome de usuário fornecido.
     * @throws auth/username-required Lançado se o nome de usuário não for fornecido.
     * @throws auth/email-required Lançado se o endereço de e-mail não for fornecido.
     * @throws auth/password-required Lançado se a senha não for fornecida.
     * @throws auth/username-email-mismatch Lançado se o nome de usuário e o endereço de e-mail não corresponderem.
     * @throws auth/username-email-already-in-use Lançado se já existir uma conta com o nome de usuário ou endereço de e-mail fornecido.
     * @throws auth/username-email-not-found Lançado se não houver usuário correspondente ao nome de usuário ou endereço de e-mail fornecido.
     * @throws auth/username-email-required Lançado se o nome de usuário e o endereço de e-mail não forem fornecidos.
     * @throws auth/username-email-require-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
     */
    async createUserWithUsernameAndPassword(username, email, password, signIn = true) {
        const result = await this.app.request({
            method: "POST",
            route: `/auth/${this.database}/signup`,
            data: {
                username,
                email,
                password,
                displayName: email,
                display_name: email,
                settings: {},
            },
        });
        if (signIn) {
            return this.handleSignInResult(result);
        }
        return new AuthUser(this, result.user, result.access_token);
    }
    /**
     * Loga de forma assíncrona usando um email e senha.
     * @param email O endereço de e-mail do usuário.
     * @param password A senha do usuário.
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/desconnect Lançado se o servidor não estiver conectado.
     * @throws auth/system-error Lançado se ocorrer um erro interno no servidor.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao e-mail fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao e-mail fornecido.
     * @throws auth/wrong-password Lançado se a senha for inválida para o e-mail fornecido, ou se a conta correspondente ao e-mail não tiver uma senha definida.
     */
    async signInWithEmailAndPassword(email, password) {
        try {
            const result = await this.app
                .request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "email", email, password, client_id: this.app.socket && this.app.socket.id },
            })
                .catch((e) => { });
            return this.handleSignInResult(result);
        }
        catch (error) {
            const access_token = this.user?.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Loga de forma assíncrona usando um nome de usuário e senha.
     * @param username O nome de usuário do usuário.
     * @param password A senha do usuário.
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/invalid-username Lançado se o nome de usuário não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao nome de usuário fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao nome de usuário fornecido.
     * @throws auth/wrong-password Lançado se a senha for inválida para o nome de usuário fornecido, ou se a conta correspondente ao nome de usuário não tiver uma senha definida.
     */
    async signInWithUsernameAndPassword(username, password) {
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "account", username, password, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result);
        }
        catch (error) {
            const access_token = this.user?.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Loga de forma assíncrona usando um token de acesso.
     * @param token O token de acesso do usuário.
     * @param emitEvent Se deve ou não emitir o evento de login
     * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
     * @throws auth/invalid-token Lançado se o token de acesso não for válido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao token de acesso fornecido foi desativado.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao token de acesso fornecido.
     * @throws auth/wrong-token Lançado se o token de acesso for inválido para o usuário fornecido.
     */
    async signInWithToken(token, emitEvent = true) {
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "token", access_token: token, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result, emitEvent);
        }
        catch (error) {
            const access_token = this.user?.accessToken;
            this.user = null;
            this.emit("signout", access_token);
            throw error;
        }
    }
    /**
     * Desconecta o usuário atual.
     * @returns Uma promise que é resolvida quando a operação de desconexão for concluída.
     */
    async signOut() {
        if (!this.user || !this.user.accessToken) {
            return Promise.resolve();
        }
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/signout`, data: { client_id: this.app.socket && this.app.socket.id } });
        const access_token = this.user.accessToken;
        this.user = null;
        localStorage.removeItem(`[${this.database}][auth_user]`);
        this.emit("signout", access_token);
    }
    /**
     * Adiciona um observador para mudanças no estado de login do usuário.
     * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
     * @returns Uma função que remove o observador.
     */
    onAuthStateChanged(callback) {
        const byCallback = (user) => {
            callback(user instanceof AuthUser ? user : null);
        };
        this.on("signin", byCallback);
        this.on("signout", byCallback);
        const stop = () => {
            this.off("signin", byCallback);
            this.off("signout", byCallback);
        };
        return {
            stop,
        };
    }
    /**
     * Adiciona um observador para mudanças no token de ID do usuário conectado, que inclui eventos de login, logout e atualização de token.
     * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
     * @returns Uma função que remove o observador.
     */
    onIdTokenChanged(callback) {
        const byCallback = (user) => {
            callback(user instanceof AuthUser ? user?.accessToken ?? null : null);
        };
        this.on("signin", byCallback);
        this.on("signout", byCallback);
        const stop = () => {
            this.off("signin", byCallback);
            this.off("signout", byCallback);
        };
        return {
            stop,
        };
    }
    /**
     * Define de forma assíncrona o usuário fornecido como currentUser na instância de Auth atual. Será feita uma cópia da instância do usuário fornecido e definida como currentUser.
     * @param user Um usuário a ser definido como currentUser na instância de Auth atual.
     * @returns Uma promise que é resolvida quando o usuário é definido como currentUser na instância de Auth atual.
     * @throws auth/invalid-user-token Lançado se o token do usuário fornecido for inválido.
     * @throws auth/user-token-expired Lançado se o token do usuário fornecido estiver expirado.
     * @throws auth/null-user Lançado se o usuário fornecido for nulo.
     * @throws auth/tenant-id-mismatch Lançado se o ID do locatário do usuário fornecido não corresponder ao ID do locatário da instância de Auth.
     */
    updateCurrentUser(user) {
        this.user = user;
    }
    /**
     * Envia um e-mail de redefinição de senha para o endereço de e-mail fornecido.
     * @param email O endereço de e-mail do usuário.
     * @returns Uma promise que é resolvida quando o e-mail de redefinição de senha é enviado.
     * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
     * @throws auth/missing-android-pkg-name Lançado se o nome do pacote Android estiver ausente quando o aplicativo Android for necessário.
     * @throws auth/missing-continue-uri Lançado se a URL de continuação estiver ausente quando o widget da web for necessário.
     * @throws auth/missing-ios-bundle-id Lançado se o ID do pacote iOS estiver ausente quando o aplicativo iOS for necessário.
     * @throws auth/invalid-continue-uri Lançado se a URL de continuação for inválida.
     * @throws auth/unauthorized-continue-uri Lançado se o domínio da URL de continuação não estiver na lista de permissões. Coloque o domínio na lista de permissões no console do Firebase.
     * @throws auth/user-not-found Lançado se não houver usuário correspondente ao endereço de e-mail.
     */
    async sendPasswordResetEmail(email) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/forgot_password`, data: { email } });
    }
    /**
     * Aplica um código de verificação enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de verificação enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de verificação for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    async applyActionCode(code) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/verify_email`, data: { code } });
        return result.email;
    }
    /**
     * Verifica um código de verificação enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de verificação enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de verificação for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    checkActionCode(code) {
        throw new Error("Method not implemented.");
    }
    /**
     * Confirma o novo endereço de e-mail do usuário usando um código de verificação.
     * @param code O código de verificação de e-mail enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o novo e-mail for verificado com sucesso.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     * @throws auth/weak-password Lançado se o novo e-mail for inválido.
     */
    async confirmPasswordReset(code, newPassword) {
        const result = await this.app.request({ method: "POST", route: `/auth/${this.database}/reset_password`, data: { code, password: newPassword } });
    }
    /**
     * Verifica um código de redefinição de senha enviado ao usuário por e-mail ou outro mecanismo fora de banda.
     * @param code Código de redefinição de senha enviado ao usuário.
     * @returns Uma promise que é resolvida com o endereço de e-mail do usuário se o código de redefinição de senha for válido.
     * @throws auth/expired-action-code Lançado se o código de ação expirou.
     * @throws auth/invalid-action-code Lançado se o código de ação for inválido.
     * @throws auth/user-disabled Lançado se o usuário correspondente ao código de ação estiver desativado.
     * @throws auth/user-not-found Lançado se o usuário correspondente ao código de ação não for encontrado.
     */
    verifyPasswordResetCode(code) {
        throw new Error("Method not implemented.");
    }
}
export function getAuth(...args) {
    let app = args.find((a) => a instanceof IvipBaseApp), dbName;
    const appNames = getAppsName();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? getApp(name) : getFirstApp();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (!hasDatabase(dbName)) {
        throw new Error(`Database "${dbName}" does not exist`);
    }
    if (app.auth.has(dbName)) {
        return app.auth.get(dbName);
    }
    const auth = new Auth(dbName, app);
    app.auth.set(dbName, auth);
    return auth;
}
//# sourceMappingURL=index.js.map