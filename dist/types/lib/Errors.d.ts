import { Response } from './Http';
export declare abstract class NestedError extends Error {
    readonly inner?: Error;
    readonly id: number;
    constructor(message: string, id: number, inner?: Error);
    toString(): string;
}
export declare class DatabaseError extends NestedError {
}
export declare class DataError extends NestedError {
}
export declare const sendNotAuthenticatedError: (res: Response, code: string, message: string) => void;
export declare const sendUnauthorizedError: (res: Response, code: string, message: string) => void;
interface ErrorLike {
    code?: string;
    message: string;
    stack?: string;
}
export declare const sendError: (res: Response, err: ErrorLike) => void;
export declare const sendBadRequestError: (res: Response, err: {
    code: string;
    message: string;
}) => void;
export declare const sendUnexpectedError: (res: Response, err: Error) => void;
export {};
//# sourceMappingURL=Errors.d.ts.map