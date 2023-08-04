"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.sendUnexpectedError = exports.sendBadRequestError = exports.sendError = exports.sendUnauthorizedError = exports.sendNotAuthenticatedError = exports.DataError = exports.DatabaseError = exports.NestedError = void 0;
class NestedError extends Error {
    constructor(message, id, inner) {
        super(message);
        this.inner = inner;
        this.id = id;
        this.name = this.constructor.name;
    }
    toString() {
        const string = this.name + ': ' + this.message;
        if (this.inner) {
            return string + ':\n' + this.inner;
        }
        return string;
    }
}
exports.NestedError = NestedError;
class DatabaseError extends NestedError {
}
exports.DatabaseError = DatabaseError;
class DataError extends NestedError {
}
exports.DataError = DataError;
const sendNotAuthenticatedError = (res, code, message) => {
    res.statusCode = 401; // Unauthorized (not unauthenticated)
    res.statusMessage = 'Not Authenticated';
    res.contentType('application/json').send({ code, message });
};
exports.sendNotAuthenticatedError = sendNotAuthenticatedError;
const sendUnauthorizedError = (res, code, message) => {
    res.statusCode = 403; // Forbidden
    res.statusMessage = 'Unauthorized';
    res.contentType('application/json').send({ code, message });
};
exports.sendUnauthorizedError = sendUnauthorizedError;
const sendError = (res, err) => {
    res.contentType('application/json');
    if (typeof err.code === 'string') {
        (0, exports.sendBadRequestError)(res, err); //res.status(400).send({ code: err.code, message: err.message }); // Bad Request
    }
    else {
        (0, exports.sendUnexpectedError)(res, err); // res.status(500).send({ code: 'unknown', message: 'server error', details: err.message }); // Internal server error
    }
};
exports.sendError = sendError;
const sendBadRequestError = (res, err) => {
    res.status(400).contentType('application/json').send({ code: err.code, message: err.message }); // Bad Request
};
exports.sendBadRequestError = sendBadRequestError;
const sendUnexpectedError = (res, err) => {
    res.status(500).contentType('application/json').send({ code: 'unexpected', message: 'server error', details: err.message }); // Internal server error
};
exports.sendUnexpectedError = sendUnexpectedError;
//# sourceMappingURL=Errors.js.map