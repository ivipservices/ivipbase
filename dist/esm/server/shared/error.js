export const sendNotAuthenticatedError = (res, code, message) => {
    res.statusCode = 401; // Não autenticado (not unauthenticated)
    res.statusMessage = "auth/not-authenticated";
    res.contentType("application/json").send({ code, message });
};
export const sendUnauthorizedError = (res, code, message) => {
    res.statusCode = 403; // Proibido
    res.statusMessage = "auth/unauthorized";
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
    res.statusCode = 400;
    res.statusMessage = err.code;
    res.contentType("application/json").send({ code: err.code, message: err.message });
};
export const sendUnexpectedError = (res, err) => {
    res.statusCode = 500;
    res.statusMessage = "app/system-error";
    res.contentType("application/json").send({ code: "unexpected", message: "app/system-error", details: err.message });
};
//# sourceMappingURL=error.js.map