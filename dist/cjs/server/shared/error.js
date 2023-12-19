"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUnexpectedError = exports.sendBadRequestError = exports.sendError = exports.sendUnauthorizedError = exports.sendNotAuthenticatedError = void 0;
const sendNotAuthenticatedError = (res, code, message) => {
    res.statusCode = 401; // Não autenticado (not unauthenticated)
    res.statusMessage = "Not Authenticated";
    res.contentType("application/json").send({ code, message });
};
exports.sendNotAuthenticatedError = sendNotAuthenticatedError;
const sendUnauthorizedError = (res, code, message) => {
    res.statusCode = 403; // Proibido
    res.statusMessage = "Unauthorized";
    res.contentType("application/json").send({ code, message });
};
exports.sendUnauthorizedError = sendUnauthorizedError;
const sendError = (res, err) => {
    res.contentType("application/json");
    if (typeof err.code === "string") {
        (0, exports.sendBadRequestError)(res, err);
    }
    else {
        (0, exports.sendUnexpectedError)(res, err);
    }
};
exports.sendError = sendError;
const sendBadRequestError = (res, err) => {
    res.status(400).contentType("application/json").send({ code: err.code, message: err.message });
};
exports.sendBadRequestError = sendBadRequestError;
const sendUnexpectedError = (res, err) => {
    res.status(500).contentType("application/json").send({ code: "unexpected", message: "server error", details: err.message });
};
exports.sendUnexpectedError = sendUnexpectedError;
//# sourceMappingURL=error.js.map