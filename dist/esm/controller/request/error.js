export class RequestError extends Error {
    get isNetworkError() {
        return this.response === null;
    }
    constructor(request, response, code, message = "unknown error") {
        super(message);
        this.request = request;
        this.response = response;
        this.code = code;
        this.message = message;
    }
}
export const NOT_CONNECTED_ERROR_MESSAGE = "remote database is not connected"; //'DataBaseClient is not connected';
//# sourceMappingURL=error.js.map