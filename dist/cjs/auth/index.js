"use strict";
var __rest = (this && this.__rest) || function (s, e) {
    var t = {};
    for (var p in s) if (Object.prototype.hasOwnProperty.call(s, p) && e.indexOf(p) < 0)
        t[p] = s[p];
    if (s != null && typeof Object.getOwnPropertySymbols === "function")
        for (var i = 0, p = Object.getOwnPropertySymbols(s); i < p.length; i++) {
            if (e.indexOf(p[i]) < 0 && Object.prototype.propertyIsEnumerable.call(s, p[i]))
                t[p[i]] = s[p[i]];
        }
    return t;
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.getAuth = exports.Auth = exports.AuthUser = void 0;
const app_1 = require("../app");
const database_1 = require("../database");
const ivipbase_core_1 = require("ivipbase-core");
const localStorage_1 = __importDefault(require("../utils/localStorage"));
const utils_1 = require("../utils");
const base64_1 = __importDefault(require("../utils/base64"));
const AUTH_USER_LOGIN_ERROR_MESSAGE = "auth/login-failed";
class AuthUser {
    constructor(auth, user, access_token = undefined) {
        var _a, _b, _c;
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
        this.displayName = (_a = user.displayName) !== null && _a !== void 0 ? _a : "unknown";
        this.created = (_b = user.created) !== null && _b !== void 0 ? _b : new Date(0).toISOString();
        this.settings = (_c = user.settings) !== null && _c !== void 0 ? _c : {};
        this._accessToken = access_token;
        this._lastAccessTokenRefresh = typeof access_token === "string" ? Date.now() : 0;
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
        var _a;
        const result = await this.auth.app.request({ method: "POST", route: `/auth/${this.auth.database}/update`, data: profile });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
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
        var _a;
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                email,
            },
        });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
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
        var _a;
        const result = await this.auth.app.request({
            method: "POST",
            route: `/auth/${this.auth.database}/update`,
            data: {
                username,
            },
        });
        Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
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
        var _a, _b;
        const now = Date.now();
        forceRefresh = forceRefresh || now - this._lastAccessTokenRefresh > 1000 * 60 * 15; // 15 minutes
        if (this._accessToken && forceRefresh) {
            try {
                const result = await this.auth.app.request({
                    method: "POST",
                    route: `/auth/${this.auth.database}/signin`,
                    data: { method: "token", access_token: this._accessToken, client_id: this.auth.app.socket && this.auth.app.socket.id },
                });
                Object.assign(this, (_a = result.user) !== null && _a !== void 0 ? _a : {});
                this._accessToken = result.access_token;
                this._lastAccessTokenRefresh = Date.now();
                this.auth.emit("signin", this);
            }
            catch (_c) {
                const access_token = this._accessToken;
                this._accessToken = undefined;
                this.auth.emit("signout", access_token);
                throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
            }
        }
        return Promise.resolve((_b = this._accessToken) !== null && _b !== void 0 ? _b : "");
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
    async reload() {
        if (!this._accessToken) {
            throw new Error(AUTH_USER_LOGIN_ERROR_MESSAGE);
        }
        await this.getIdToken(true);
    }
    /**
     * Retorna uma representação JSON serializável deste objeto.
     * @returns Uma representação JSON serializável deste objeto.
     */
    toJSON() {
        var _a;
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
            providerData: (_a = this.providerData) !== null && _a !== void 0 ? _a : [],
        };
    }
    /**
     * Cria uma instância de AuthUser a partir de um objeto JSON.
     * @param auth Uma instância de Auth.
     * @param json Um objeto JSON representando um usuário.
     * @returns Uma instância de AuthUser criada a partir do objeto JSON.
     */
    static fromJSON(auth, json) {
        const { accessToken, providerData } = json, userInfo = __rest(json, ["accessToken", "providerData"]);
        return new AuthUser(auth, userInfo, accessToken);
    }
}
exports.AuthUser = AuthUser;
class Auth extends ivipbase_core_1.SimpleEventEmitter {
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
        app.once("connect", () => {
            var _a, _b;
            if ((_a = this._user) === null || _a === void 0 ? void 0 : _a.accessToken) {
                (_b = this.app.socket) === null || _b === void 0 ? void 0 : _b.emit("signin", { dbName: this.database, accessToken: this._user.accessToken });
            }
        });
        this.on("ready", () => {
            this._ready = true;
        });
        this.on("signin", (user) => {
            var _a;
            try {
                if (user) {
                    this._user = user;
                    localStorage_1.default.setItem(`[${this.database}][auth_user]`, base64_1.default.encode(JSON.stringify(user.toJSON())));
                }
                else {
                    this._user = null;
                    localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
                }
            }
            catch (_b) {
                this._user = null;
                localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            }
            if (!this._ready) {
                this.emit("ready");
            }
            (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.emit("signin", { dbName: this.database, accessToken: user.accessToken });
        });
        this.on("signout", (accessToken) => {
            var _a;
            this._user = null;
            localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            if (!this._ready) {
                this.emit("ready");
            }
            if (accessToken) {
                (_a = this.app.socket) === null || _a === void 0 ? void 0 : _a.emit("signout", { dbName: this.database, accessToken });
            }
        });
        this.initialize();
    }
    async initialize() {
        try {
            if (!this._user) {
                const user = localStorage_1.default.getItem(`[${this.database}][auth_user]`);
                if (user) {
                    this._user = AuthUser.fromJSON(this, JSON.parse(base64_1.default.decode(user)));
                    await this._user.reload();
                }
            }
        }
        catch (_a) {
            this._user = null;
            localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            if (!this._ready) {
                this.emit("ready");
            }
        }
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
        callback === null || callback === void 0 ? void 0 : callback(this._user);
    }
    get user() {
        return this._user;
    }
    set user(value) {
        try {
            if (value) {
                localStorage_1.default.setItem(`[${this.database}][auth_user]`, base64_1.default.encode(JSON.stringify(value.toJSON())));
            }
            else {
                localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
            }
        }
        catch (_a) { }
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
                username: (0, utils_1.sanitizeEmailPrefix)(email),
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
        var _a;
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
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
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
        var _a;
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "account", username, password, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result);
        }
        catch (error) {
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
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
        var _a;
        try {
            const result = await this.app.request({
                method: "POST",
                route: `/auth/${this.database}/signin`,
                data: { method: "token", access_token: token, client_id: this.app.socket && this.app.socket.id },
            });
            return this.handleSignInResult(result, emitEvent);
        }
        catch (error) {
            const access_token = (_a = this.user) === null || _a === void 0 ? void 0 : _a.accessToken;
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
        localStorage_1.default.removeItem(`[${this.database}][auth_user]`);
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
            var _a;
            callback(user instanceof AuthUser ? (_a = user === null || user === void 0 ? void 0 : user.accessToken) !== null && _a !== void 0 ? _a : null : null);
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
exports.Auth = Auth;
function getAuth(...args) {
    let app = args.find((a) => a instanceof app_1.IvipBaseApp), dbName;
    const appNames = (0, app_1.getAppsName)();
    if (!app) {
        const name = appNames.find((n) => args.includes(n));
        app = name ? (0, app_1.getApp)(name) : (0, app_1.getFirstApp)();
    }
    let database = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);
    if (typeof database !== "string") {
        database = app.settings.dbname;
    }
    dbName = (Array.isArray(database) ? database : [database])[0];
    if (!(0, database_1.hasDatabase)(dbName)) {
        throw new Error(`Database "${dbName}" does not exist`);
    }
    if (dbName && app.auth.has(dbName)) {
        return app.auth.get(dbName);
    }
    const auth = new Auth((Array.isArray(database) ? database : [database])[0], app);
    app.auth.set(dbName, auth);
    return auth;
}
exports.getAuth = getAuth;
//# sourceMappingURL=index.js.map