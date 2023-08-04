import { Response } from './Http';

export abstract class NestedError extends Error {
    readonly inner?: Error;
    readonly id: number;

    public constructor(message: string, id: number, inner?: Error) {
        super(message);
        this.inner = inner;
        this.id = id;
        this.name = this.constructor.name;
    }

    toString(): string {
        const string = this.name + ': ' + this.message;
        if (this.inner) {
            return string + ':\n' + this.inner;
        }
        return string;
    }
}

export class DatabaseError extends NestedError {}

export class DataError extends NestedError {}

export const sendNotAuthenticatedError = (res: Response, code: string, message: string) => {
    res.statusCode = 401; // Unauthorized (not unauthenticated)
    res.statusMessage = 'Not Authenticated';
    res.contentType('application/json').send({ code, message });
};

export const sendUnauthorizedError = (res: Response, code: string, message: string) => {
    res.statusCode = 403; // Forbidden
    res.statusMessage = 'Unauthorized';
    res.contentType('application/json').send({ code, message });
};

interface ErrorLike {
	code?: string;
	message: string;
	stack?: string;
}

export const sendError = (res: Response, err: ErrorLike) => {
    res.contentType('application/json');
    if (typeof err.code === 'string') {
        sendBadRequestError(res, err as { code: string; message: string }); //res.status(400).send({ code: err.code, message: err.message }); // Bad Request
    } else {
        sendUnexpectedError(res, err as Error); // res.status(500).send({ code: 'unknown', message: 'server error', details: err.message }); // Internal server error
    }
};

export const sendBadRequestError = (res: Response, err: { code: string; message: string }) => {
    res.status(400).contentType('application/json').send({ code: err.code, message: err.message }); // Bad Request
};

export const sendUnexpectedError = (res: Response, err: Error) => {
    res.status(500).contentType('application/json').send({ code: 'unexpected', message: 'server error', details: err.message }); // Internal server error
};
