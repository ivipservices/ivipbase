import type { LocalServer, RouteRequest } from "../../";
import { Mime, getExtension } from "../../../utils";
import { sendError, sendUnauthorizedError } from "../../shared/error";
import fs from "fs";
import parseDataURL from "data-urls";
import getRawBody from "raw-body";
import $path from "path";
import { fileTypeFromBuffer } from "file-type";

export type RequestQuery = null;
export type RequestBody = {
	format?: "base64" | "base64url" | "text" | "raw" | "data_url";
	contentType?: string;
	data?: string;
	file?: {
		path: string;
	};
};
export type ResponseBody = {
	message: string;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

export const addRoute = (env: LocalServer) => {
	env.router.put(`/storage/:dbName/*`, async (req: Request, res) => {
		const { dbName } = req.params;

		if (!env.hasDatabase(dbName)) {
			return sendError(res, {
				code: "not_found",
				message: `Database '${dbName}' not found`,
			});
		}

		const path = req.params[0];

		// if (!req.user) {
		// 	return sendUnauthorizedError(res, "storage/unauthorized", "Você deve estar logado para acessar este recurso");
		// }

		const data = await new Promise<Buffer>((resolve, reject) =>
			getRawBody(req, async (err, body) => {
				if (err) {
					reject(err);
				} else {
					resolve(body);
				}
			}),
		);

		const dirUpload = $path.resolve(env.settings.localPath, `./${dbName}/storage-uploads`);
		if (!fs.existsSync(dirUpload)) {
			fs.mkdirSync(dirUpload, { recursive: true });
		}

		try {
			const ref = env.db(dbName).ref(`__storage__`).child(path);

			const snapshot = await ref.get();

			if (snapshot.exists()) {
				const { path: _path } = snapshot.val();

				if (typeof _path === "string") {
					const storage_path = $path.resolve(env.settings.localPath, `./${dbName}`, _path);
					if (fs.existsSync(storage_path)) {
						fs.unlinkSync(storage_path);
					}
				}
			}
			let extensionFile = getExtension(req.params[0]) || "";
			let mimetype = "application/octet-binary";

			if (typeof extensionFile === "string" && extensionFile.trim() !== "") {
				mimetype = Mime.getType(req.params[0]);
			}

			let file = {
				filename: `file-${Date.now()}`,
				mimetype: mimetype,
				size: 0,
			};

			if (typeof req.body.format === "string" && ["base64", "base64url", "text", "raw", "data_url"].includes(req.body.format)) {
				let format = req.body.format,
					dataUrl = "";

				mimetype = typeof req.body.contentType === "string" && Mime.getExtension(req.body.contentType) ? req.body.contentType : mimetype;

				switch (format) {
					case "base64":
					case "base64url":
					case "raw":
						dataUrl = `data:${mimetype};${format},`;
						break;
					case "text":
						dataUrl = `data:text/plain;text,`;
						break;
				}

				dataUrl += req.body.data;
				const body = parseDataURL(dataUrl)?.body;

				if (!body) {
					return sendError(res, {
						code: "storage/unknown",
						message: "Invalid request",
					});
				}

				const data = Buffer.from(body);

				file = {
					...file,
					mimetype: mimetype,
					size: data.length,
				};

				fs.appendFileSync($path.resolve(dirUpload, file.filename), data);
			} else if (req.body.file) {
				const stats = fs.statSync(req.body.file.path);

				file = {
					...file,
					size: stats.size,
				};

				const rs = fs.createReadStream(req.body.file.path);
				const ws = fs.createWriteStream($path.resolve(dirUpload, file.filename));

				rs.pipe(ws);
			} else if (data instanceof Buffer) {
				const type = await fileTypeFromBuffer(data);

				file = {
					...file,
					mimetype: type?.mime || mimetype,
					size: data.length,
				};

				fs.writeFileSync($path.resolve(dirUpload, file.filename), data);
			} else {
				return sendError(res, {
					code: "storage/unknown",
					message: "Invalid request",
				});
			}

			const storage = {
				path: `storage-uploads/${file.filename}`,
				isFile: true,
				metadata: {
					contentType: mimetype,
					size: file.size,
				},
			};

			await ref.set(storage);

			res.send({ message: "Upload storage successfully." });
		} catch (err) {
			res.statusCode = 500;
			res.send(err as any);
		}
	});
};

export default addRoute;
