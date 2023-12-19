"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.adminOnly = void 0;
const error_1 = require("../shared/error");
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
const adminOnly = (env, errorMessage = "somente administradores podem realizar esta operação") => {
    return (req, res, next) => {
        if (env.settings.auth.enabled && (!req.user || req.user.uid !== "admin")) {
            return (0, error_1.sendUnauthorizedError)(res, "admin_only", errorMessage);
        }
        next();
    };
};
exports.adminOnly = adminOnly;
exports.default = exports.adminOnly;
//# sourceMappingURL=admin-only.js.map