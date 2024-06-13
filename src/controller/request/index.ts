import { RequestError } from "./error";
import axios, { AxiosProgressEvent, AxiosRequestConfig } from "axios";

/**
 * @returns returns a promise that resolves with an object containing data and an optionally returned context
 */
export default async function request(
	method: "GET" | "POST" | "PUT" | "DELETE",
	url: string,
	options: {
		accessToken?: string | null;
		data?: any;
		dataReceivedCallback?: ((chunk: any) => void) | null;
		dataRequestCallback?: ((bytes: number) => Promise<any> | any) | null;
		onUploadProgress?: (progressEvent: AxiosProgressEvent) => void;
		onDownloadProgress?: (progressEvent: AxiosProgressEvent) => void;
		context?: any;
	} = { accessToken: null, data: null, dataReceivedCallback: null, dataRequestCallback: null, context: null },
): Promise<{ context: any; data: any }> {
	let postData = options.data,
		isJson = false;
	if (typeof postData === "undefined" || postData === null) {
		postData = "";
	} else if (["[object Object]", "[object Array]"].includes(Object.prototype.toString.call(postData))) {
		postData = JSON.stringify(postData);
		isJson = true;
	}
	const headers: Record<string, string> = {
		"DataBase-Context": JSON.stringify(options.context || null),
	};
	const request: AxiosRequestConfig = {
		url,
		method,
		headers,
		data: undefined,
		onUploadProgress: options.onUploadProgress,
		onDownloadProgress: options.onDownloadProgress,
		responseType: options.dataReceivedCallback ? "arraybuffer" : "text",
	};
	if (typeof options.dataRequestCallback === "function") {
		// Stream data to the server instead of posting all from memory at once
		headers["Content-Type"] = "text/plain"; // Prevent server middleware parsing the content as JSON

		postData = "";
		const chunkSize = 1024 * 512; // Use large chunk size, we have to store everything in memory anyway.
		let chunk: any;
		while ((chunk = await options.dataRequestCallback(chunkSize))) {
			postData += chunk;
		}
		request.data = postData;
	} else if (typeof postData === "string" && isJson) {
		headers["Content-Type"] = "application/json";
		request.data = postData;
	} else {
		headers["Content-Type"] = "application/octet-stream";
		// headers["Content-Length"] = postData.length;
		request.data = postData;
	}
	if (options.accessToken) {
		headers["Authorization"] = `Bearer ${options.accessToken}`;
	}

	const res = await axios(request).catch((err) => {
		// console.error(err);
		throw new RequestError(request, null, "fetch_failed", err.message);
	});

	// const res = await fetch(request.url, request).catch((err) => {
	// 	// console.error(err);
	// 	throw new RequestError(request, null, "fetch_failed", err.message);
	// });

	let data = res.data;

	if (typeof options.dataReceivedCallback === "function") {
		options.dataReceivedCallback(res.data);
	}

	const isJSON = data[0] === "{" || data[0] === "["; // || (res.headers['content-type'] || '').startsWith('application/json')
	if (res.status !== 200) {
		const response = {
			statusCode: res.status,
			statusMessage: res.statusText,
			headers: res.headers,
			body: data,
		};
		let code = res.status,
			message = res.statusText;
		if (isJSON) {
			const err = JSON.parse(data);
			if (err.code) {
				code = err.code;
			}
			if (err.message) {
				message = err.message;
			}
		} else if ("code" in data || "message" in data) {
			code = data.code ?? res.status;
			message = data.message ?? res.statusText;
		}
		throw new RequestError({ ...request, body: postData }, response, code, message);
	}

	const contextHeader = res.headers["DataBase-Context"] ?? res.headers["database-context"];
	let context: Record<string, any>;
	if (contextHeader && contextHeader[0] === "{") {
		context = JSON.parse(contextHeader);
	} else {
		context = {};
	}
	if (isJSON) {
		data = JSON.parse(data);
	}
	return { context, data } as any;
}
