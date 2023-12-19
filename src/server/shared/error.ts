import { Response } from "../";

export const sendNotAuthenticatedError = (res: Response, code: string, message: string) => {
	res.statusCode = 401; // Não autenticado (not unauthenticated)
	res.statusMessage = "Not Authenticated";
	res.contentType("application/json").send({ code, message });
};

export const sendUnauthorizedError = (res: Response, code: string, message: string) => {
	res.statusCode = 403; // Proibido
	res.statusMessage = "Unauthorized";
	res.contentType("application/json").send({ code, message });
};

interface ErrorLike {
	code?: string;
	message: string;
	stack?: string;
}

export const sendError = (res: Response, err: ErrorLike) => {
	res.contentType("application/json");
	if (typeof err.code === "string") {
		sendBadRequestError(res, err as { code: string; message: string });
	} else {
		sendUnexpectedError(res, err as Error);
	}
};

export const sendBadRequestError = (res: Response, err: { code: string; message: string }) => {
	res.status(400).contentType("application/json").send({ code: err.code, message: err.message });
};

export const sendUnexpectedError = (res: Response, err: Error) => {
	res.status(500).contentType("application/json").send({ code: "unexpected", message: "server error", details: err.message });
};
