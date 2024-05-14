export class RequestError extends Error {
	get isNetworkError() {
		return this.response === null;
	}
	constructor(public request: any, public response: any, public code?: number | string, public message: string = "unknown error") {
		super(message);
	}
}
export const NOT_CONNECTED_ERROR_MESSAGE = "remote database is not connected"; //'DataBaseClient is not connected';
