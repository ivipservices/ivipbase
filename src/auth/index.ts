import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app";
import { hasDatabase } from "../database";

export class AuthUser {
	/**
	 * unique id
	 */
	uid: string;

	/**
	 * username used for signing in
	 */
	username?: string;

	/**
	 * email address used for signing in
	 */
	email?: string;

	/**
	 * display or screen name
	 */
	displayName: string;

	/**
	 * User profile picture
	 */
	picture?: { width: number; height: number; url: string };

	/**
	 * Whether the user's email address has been verified
	 */
	emailVerified = false;

	/**
	 * Date/time this user record was created (ISO date string)
	 */
	created: string;

	/**
	 * Date/time this user previously signed in (ISO date string)
	 */
	prevSignin?: string;

	/**
	 * IP address of previous signin
	 */
	prevSigninIp?: string;

	/**
	 * Date/time this user last signed in (ISO date string)
	 */
	lastSignin?: string;

	/**
	 * IP address of last signin
	 */
	lastSigninIp?: string;

	/**
	 * Whether the user has to change their password
	 */
	changePassword = false;

	/**
	 * If `changePassword` is true, date/time the password change was requested (ISO date string)
	 */
	changePasswordRequested?: string;

	/**
	 * If `changePassword` is true, date/time the password must have been changed (ISO date string)
	 */
	changePasswordBefore?: string;

	/**
	 * Additional saved user settings & info
	 */
	settings: { [key: string]: string | number | boolean };

	/**
	 * Access token of currently signed in user
	 */
	private _accessToken: string | undefined;

	constructor(user: Partial<AuthUser>) {
		Object.assign(this, user);
		if (!user.uid) {
			throw new Error("User details is missing required uid field");
		}
		this.uid = user.uid;
		this.displayName = user.displayName ?? "unknown";
		this.created = user.created ?? new Date(0).toISOString();
		this.settings = user.settings ?? {};
	}

	get accessToken(): string | undefined {
		return this._accessToken;
	}

	get providerData(): { providerId: string; uid: string; displayName: string; email: string; photoURL: string }[] {
		return [];
	}

	/**
	 * Atualiza os dados do perfil de um usuário.
	 * @param profile O displayName e o photoURL do perfil para atualizar.
	 * @returns Uma promise que é resolvida quando a atualização for concluída.
	 * @throws auth/invalid-display-name Lançado se o nome de exibição for inválido.
	 * @throws auth/invalid-photo-url Lançado se a URL da foto for inválida.
	 */
	updateProfile(profile: { displayName?: string; photoURL?: string }): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Atualiza o endereço de e-mail do usuário.
	 * @param email O novo endereço de e-mail do usuário.
	 * @returns Uma promise que é resolvida se o novo e-mail for válido e atualizado com sucesso no banco de dados do usuário.
	 * @throws auth/email-already-in-use Lançado se o e-mail já estiver em uso por outro usuário.
	 * @throws auth/invalid-email Lançado se o e-mail não for válido.
	 * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
	 */
	updateEmail(email: string): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Atualiza a senha do usuário.
	 * @param password A nova senha do usuário.
	 * @returns Uma promise que é resolvida se a nova senha for válida e atualizada com sucesso no banco de dados do usuário.
	 * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
	 * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
	 */
	updatePassword(password: string): Promise<void> {
		throw new Error("Method not implemented.");
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
	sendEmailVerification(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Exclui a conta do usuário (também desconecta o usuário)
	 * @returns Uma promise que é resolvida quando a conta do usuário for excluída
	 * @throws auth/requires-recent-login Lançado se o último tempo de login do usuário não atender ao limite de segurança. Use reauthenticateWithCredential para resolver. Isso não se aplica se o usuário for anônimo.
	 */
	delete(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Retorna um JSON Web Token (JWT) usado para identificar o usuário a um serviço Firebase.
	 * @param forceRefresh Indica se deve ou não forçar a atualização do token
	 * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
	 */
	getIdToken(forceRefresh?: boolean): Promise<string> {
		return Promise.resolve(this._accessToken ?? "");
	}

	/**
	 * Retorna um JSON Web Token (JWT) desserializado usado para identificar o usuário a um serviço Firebase.
	 * @param forceRefresh Indica se deve ou não forçar a atualização do token
	 * @returns Uma promise que é resolvida com o token atual se não tiver expirado. Caso contrário, será null.
	 */
	getIdTokenResult(forceRefresh?: boolean): Promise<{ token: string; expirationTime: number; authTime: number; issuedAtTime: number; signInProvider: string; claims: { [key: string]: any } }> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Atualiza o usuário atual, se estiver conectado.
	 * @returns Uma promise que é resolvida com o usuário atual após uma possível atualização do token.
	 */
	reload(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Retorna uma representação JSON serializável deste objeto.
	 * @returns Uma representação JSON serializável deste objeto.
	 */
	toJSON(): {
		uid: string;
		displayName: string;
		email: string;
		emailVerified: boolean;
		photoURL: string;
		phoneNumber: string;
		isAnonymous: boolean;
		tenantId: string;
		providerData: { providerId: string; uid: string; displayName: string; email: string; photoURL: string };
	} {
		throw new Error("Method not implemented.");
	}
}

export class Auth {
	readonly isValidAuth: boolean;

	/**
	 * Currently signed in user
	 */
	public user: AuthUser | null = null;

	constructor(readonly database: string, readonly app: IvipBaseApp) {
		this.isValidAuth = app.isServer || !app.settings.isValidClient ? false : true;
	}

	get currentUser(): AuthUser | null {
		return this.user;
	}

	/**
	 * Cria uma nova conta de usuário associada ao endereço de e-mail e senha especificados.
	 * @param email O endereço de e-mail do usuário.
	 * @param password A senha escolhida pelo usuário.
	 * @returns Uma promise que é resolvida com as informações do novo usuário criado.
	 * @throws auth/email-already-in-use Lançado se já existir uma conta com o endereço de e-mail fornecido.
	 * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
	 * @throws auth/operation-not-allowed Lançado se contas de e-mail/senha não estiverem habilitadas. Habilite contas de e-mail/senha no Console do Firebase, na aba Auth.
	 * @throws auth/weak-password Lançado se a senha não for forte o suficiente.
	 */
	createUserWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Loga de forma assíncrona usando um email e senha.
	 * @param email O endereço de e-mail do usuário.
	 * @param password A senha do usuário.
	 * @returns Uma promise que é resolvida com as informações do usuário recém-criado.
	 * @throws auth/invalid-email Lançado se o endereço de e-mail não for válido.
	 * @throws auth/user-disabled Lançado se o usuário correspondente ao e-mail fornecido foi desativado.
	 * @throws auth/user-not-found Lançado se não houver usuário correspondente ao e-mail fornecido.
	 * @throws auth/wrong-password Lançado se a senha for inválida para o e-mail fornecido, ou se a conta correspondente ao e-mail não tiver uma senha definida.
	 */
	signInWithEmailAndPassword(email: string, password: string): Promise<AuthUser> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Desconecta o usuário atual.
	 * @returns Uma promise que é resolvida quando a operação de desconexão for concluída.
	 */
	signOut(): Promise<void> {
		throw new Error("Method not implemented.");
	}

	/**
	 * Adiciona um observador para mudanças no estado de login do usuário.
	 * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
	 * @returns Uma função que remove o observador.
	 */
	onAuthStateChanged(callback: (user: AuthUser | null) => void): void {}

	/**
	 * Adiciona um observador para mudanças no token de ID do usuário conectado, que inclui eventos de login, logout e atualização de token.
	 * @param callback Uma função observadora do usuário. Esta função recebe o usuário atual como parâmetro. Se o usuário estiver conectado, o parâmetro é as informações do usuário; caso contrário, é null.
	 * @returns Uma função que remove o observador.
	 */
	onIdTokenChanged(callback: (user: AuthUser | null) => void): void {}

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
	sendPasswordResetEmail(email: string): Promise<void> {
		throw new Error("Method not implemented.");
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
	updateCurrentUser(user: AuthUser): void {
		throw new Error("Method not implemented.");
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
	applyActionCode(code: string): Promise<string> {
		throw new Error("Method not implemented.");
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
	checkActionCode(code: string): Promise<{ data: { email: string } }> {
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
	confirmPasswordReset(code: string, newPassword: string): Promise<void> {
		throw new Error("Method not implemented.");
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
	verifyPasswordResetCode(code: string): Promise<string> {
		throw new Error("Method not implemented.");
	}
}

export function getAuth(): Auth;
export function getAuth(app: string | IvipBaseApp | undefined): Auth;
export function getAuth(database: string): Auth;
export function getAuth(database: string, app: string | IvipBaseApp | undefined): Auth;
export function getAuth(...args: any[]) {
	let app: IvipBaseApp = args.find((a) => a instanceof IvipBaseApp),
		dbName: string | undefined;
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	let database: string | string[] = args.find((d) => typeof d === "string" && appNames.includes(d) !== true);

	if (typeof database !== "string") {
		database = app.settings.dbname;
	}

	dbName = (Array.isArray(database) ? database : [database])[0];

	if (!hasDatabase(dbName)) {
		throw new Error(`Database "${dbName}" does not exist`);
	}

	if (dbName && app.auth.has(dbName)) {
		return app.auth.get(dbName);
	}

	const auth = new Auth((Array.isArray(database) ? database : [database])[0], app);

	app.auth.set(dbName, auth);
	return auth;
}
