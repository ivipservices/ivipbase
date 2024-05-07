import type { LocalServer, RouteRequest } from "../../";
import { Transport, type DataBase, type DataReference, type Types } from "ivipbase-core";
import { sendError, sendUnauthorizedError } from "../../shared/error";

export type RequestQuery = { include?: string; exclude?: string; child_objects?: "true" | "false" };
export type RequestBody = null;
export type ResponseBody = Types.SerializedValue & { exists: boolean };
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoutes = (env: LocalServer) => {
	env.router.get(`/data/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		// Solicitar dados
		const path = req.params["0"];

		// Pré-verifique o acesso de leitura
		let access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, "get");
		if (!access.allow) {
			return sendUnauthorizedError(res, access.code, access.message);
		}

		const options: { include?: string[]; exclude?: string[]; child_objects?: boolean } = {};
		//const options: Parameters<DataReference.>[1] = {};
		if (req.query.include) {
			options.include = req.query.include.split(",");
		}
		if (req.query.exclude) {
			options.exclude = req.query.exclude.split(",");
		}
		if (["true", "false"].includes(req.query.child_objects ?? "")) {
			options.child_objects = req.query.child_objects === "true";
		}

		if (path === "") {
			// Se o usuário tiver acesso à raiz do banco de dados (NÃO recomendado para outros além do admin...)
			// Não retorna dados do servidor privado. Se o usuário administrador desejar acesso, ele deverá usar
			// direciona solicitações nesses caminhos (GET /data/dbname/__auth__) ou usa reflexão

			if (options.include) {
				// Remova todas as inclusões de caminhos privados
				options.include = options.include.filter((path: string) => !path.startsWith("__"));
			}
			// Adicione caminhos privados para excluir
			options.exclude = [...(options.exclude ?? []), "__auth__", "__log__"];
		}

		// Check 'get' access
		// access = await env.rules(dbName).isOperationAllowed(req.user ?? ({} as any), path, 'get', { context: req.context, options });
		// if (!access.allow) {
		//     return sendUnauthorizedError(res, access.code, access.message);
		// }

		try {
			const { value, context } = await env.db(dbName).storage.get(path, options);
			if (!env.settings.transactions?.log) {
				delete context.database_cursor;
			}
			//console.log(value);
			const serialized = Transport.serialize(value);

			res.setHeader("DataBase-Context", JSON.stringify(context));
			res.send({
				exists: value !== null,
				val: serialized.val,
				map: serialized.map,
			});
		} catch (err) {
			res.status(500).send(err as any);
		}
	});
};

export default addRoutes;
