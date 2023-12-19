import { LocalServer } from "..";
/**
 * Obtém opções de CORS compatíveis com o pacote 'cors' (usado pelo Socket.IO 3+)
 * @param allowedOrigins Origens permitidas
 * @returns Opções de CORS
 */
export declare const getCorsOptions: (allowedOrigins: string) => {
    origin: boolean | string[];
    methods: string;
    allowedHeaders: string;
};
/**
 * Obtém cabeçalhos CORS que podem ser enviados em solicitações de preflight (OPTIONS)
 * @param allowedOrigins Origem(s) permitida(s) configurada(s). Exemplos: `'https://meu.servidor.com'` para uma origem permitida específica, `'*'` para qualquer origem (retorna a origem atual), `''` para desativar o CORS (permitindo apenas localhost), ou `'http://servidor1.com,https://servidor1.com,https://servidor2.com'` para várias origens permitidas
 * @param currentOrigin Origem atual dos cabeçalhos da solicitação
 * @returns
 */
export declare const getCorsHeaders: (allowedOrigins: string, currentOrigin: string | undefined) => {
    "Access-Control-Allow-Origin": string;
    "Access-Control-Allow-Methods": string;
    "Access-Control-Allow-Headers": string;
    "Access-Control-Expose-Headers": string;
};
export declare const addMiddleware: (env: LocalServer) => void;
export default addMiddleware;
//# sourceMappingURL=cors.d.ts.map