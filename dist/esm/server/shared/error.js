export const sendNotAuthenticatedError = (res, code, message) => {
    res.statusCode = 401; // Não autenticado (not unauthenticated)
    res.statusMessage = "Not Authenticated";
    res.contentType("application/json").send({ code, message });
};
export const sendUnauthorizedError = (res, code, message) => {
    res.statusCode = 403; // Proibido
    res.statusMessage = "Unauthorized";
    res.contentType("application/json").send({ code, message });
};
export const sendError = (res, err) => {
    res.contentType("application/json");
    if (typeof err.code === "string") {
        sendBadRequestError(res, err);
    }
    else {
        sendUnexpectedError(res, err);
    }
};
export const sendBadRequestError = (res, err) => {
    res.status(400).contentType("application/json").send({ code: err.code, message: err.message });
};
export const sendUnexpectedError = (res, err) => {
    res.status(500).contentType("application/json").send({ code: "unexpected", message: "server error", details: err.message });
};
//# sourceMappingURL=error.js.map