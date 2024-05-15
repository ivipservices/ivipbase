import { Response } from "../";

export const sendNotAuthenticatedError = (res: Response, code: string, message: string) => {
	res.statusCode = 401; // Não autenticado (not unauthenticated)
	res.statusMessage = "auth/not-authenticated";
	res.contentType("application/json").send({ code, message });
};

export const sendUnauthorizedError = (res: Response, code: string, message: string) => {
	res.statusCode = 403; // Proibido
	res.statusMessage = "auth/unauthorized";
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
	res.statusCode = 400;
	res.statusMessage = err.code;
	res.contentType("application/json").send({ code: err.code, message: err.message });
};

export const sendUnexpectedError = (res: Response, err: Error) => {
	res.statusCode = 500;
	res.statusMessage = "app/system-error";
	res.contentType("application/json").send({ code: "unexpected", message: "app/system-error", details: err.message });
};
