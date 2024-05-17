/// <reference types="node" />
import { AbstractLocalServer, ServerSettings, ServerInitialSettings } from "./browser";
import type { Socket } from "socket.io";
import type { Express, Request, Response } from "express";
import * as express from "express";
import { Server } from "http";
import { DbUserAccountDetails } from "./schema/user";
import type { IvipBaseApp } from "../app";
import { ConnectedClient } from "./shared/clients";
import { SimpleCache } from "ivipbase-core";
export { ServerSettings, ServerInitialSettings };
export declare const isPossiblyServer = true;
export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;
export { Express, Request, Response };
type expressRouteMethod = "get" | "put" | "post" | "delete";
type HttpMethod = expressRouteMethod | "GET" | "PUT" | "POST" | "DELETE";
export interface RouteRequestEnvironment {
    /** Se a solicitação tiver um token "Authentication: bearer", o usuário será associado à solicitação recebida */
    user?: DbUserAccountDetails;
    /** Se o contexto for enviado pelo cabeçalho iVipBase-Context, será associado à solicitação recebida */
    context: {
        [key: string]: any;
    };
}
export type RouteRequest<ReqQuery = any, ReqBody = any, ResBody = any> = Request<any, ResBody, ReqBody, ReqQuery> & Partial<RouteRequestEnvironment>;
export declare class LocalServer extends AbstractLocalServer<LocalServer> {
    protected paused: boolean;
    readonly isServer: boolean;
    readonly app: HttpApp;
    readonly router: HttpRouter;
    readonly server: Server;
    readonly clients: Map<string, ConnectedClient>;
    authCache: SimpleCache<string, DbUserAccountDetails>;
    readonly metaInfoCache: SimpleCache<number, {
        cpuUsage: number;
        networkStats: {
            sent: number;
            received: number;
        };
        memoryUsage: {
            total: number;
            free: number;
            used: number;
        };
        time: number;
    }>;
    tokenSalt: string | null;
    constructor(localApp: IvipBaseApp, settings?: Partial<ServerSettings>);
    init(): Promise<void>;
    /**
     * Cria um roteador Express
     * @returns
     */
    createRouter(): express.Router;
    /**
     * Interrompe temporariamente o servidor de lidar com conexões recebidas, mas mantém as conexões existentes abertas
     */
    pause(): Promise<void>;
    /**
     * Resumo do tratamento de conexões de entrada
     */
    resume(): Promise<void>;
    /**
     * Estende a API do servidor com suas próprias funções personalizadas. Seu manipulador estará ouvindo
     * no caminho /ext/[nome do banco de dados]/[ext_path].
     * @example
     * // Lado do servidor:
     * const _quotes = [...];
     * server.extend('get', 'quotes/random', (req, res) => {
     *      let index = Math.round(Math.random() * _quotes.length);
     *      res.send(quotes[index]);
     * })
     * // Lado do cliente:
     * client.callExtension('get', 'quotes/random')
     * .then(quote => {
     *      console.log(`Got random quote: ${quote}`);
     * })
     * @param method Método HTTP para associar
     * @param ext_path Caminho para associar (anexado a /ext/)
     * @param handler Seu callback de manipulador de solicitação do Express
     */
    extend(database: string, method: HttpMethod, ext_path: string, handler: (req: HttpRequest, res: HttpResponse) => void): void;
}
//# sourceMappingURL=index.d.ts.map