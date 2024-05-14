import { NextFunction } from "express";
import { LocalServer, RouteRequest, Response } from "..";
import { sendUnauthorizedError } from "../shared/error";

/**
 * Função de middleware que verifica se o usuário atual é um `admin`. Um erro 403 Forbidden será enviado na resposta se
 * a autenticação estiver habilitada no servidor e o usuário não estiver logado como admin.
 *
 * Pode ser aplicado a qualquer rota adicionando-o na cadeia de roteadores.
 * @example
 * app.get('/endpoint', adminOnly(env), (req, res) => {
 *    // Se chegarmos aqui, somos um admin,
 *    // ou o servidor não tem autenticação habilitada.
 * })
 * @param env Ambiente de inicialização da rota
 * @param errorMessage Mensagem de erro personalizada
 * @returns
 */
export const adminOnly = (env: LocalServer, errorMessage = "somente administradores podem realizar esta operação") => {
	return (req: RouteRequest, res: Response, next: NextFunction) => {
		if (env.settings.auth.enabled && (!req.user || req.user.admin_level < 2)) {
			return sendUnauthorizedError(res, "admin_only", errorMessage);
		}
		next();
	};
};

export default adminOnly;
