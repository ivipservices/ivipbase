/// <reference types="node" />
import { AbstractLocalServer, ServerSettings } from "./browser";
import type { Socket } from "socket.io";
import type { Express, Request, Response } from "express";
import * as express from "express";
import { Server } from "http";
import { DbUserAccountDetails } from "./schema/user";
export { ServerSettings };
export declare const isPossiblyServer = true;
export type HttpApp = express.Express;
export type HttpRouter = express.Router;
export type HttpSocket = Socket;
export type HttpRequest = express.Request;
export type HttpResponse = express.Response;
export { Express, Request, Response };
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
    readonly appName: string;
    protected paused: boolean;
    readonly isServer: boolean;
    readonly app: HttpApp;
    readonly router: HttpRouter;
    readonly server: Server;
    constructor(appName: string, settings?: Partial<ServerSettings>);
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
}
//# sourceMappingURL=index.d.ts.map