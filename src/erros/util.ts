export type ErrorMap<ErrorCode extends string> = {
	readonly [K in ErrorCode]: string;
};

export interface ErrorData {
	[key: string]: unknown;
}

const ERROR_NAME = "iVipBaseError";

export class MainError extends Error {
	/** O nome personalizado para todos os iVipBaseError. */
	readonly name: string = ERROR_NAME;

	constructor(
		/** O código de erro para este erro. */
		readonly code: string,
		message: string,
		/** Dados personalizados para este erro. */
		public customData?: Record<string, unknown>,
	) {
		super(message);

		// Fix For ES5
		// https://github.com/Microsoft/TypeScript-wiki/blob/master/Breaking-Changes.md#extending-built-ins-like-error-array-and-map-may-no-longer-work
		Object.setPrototypeOf(this, MainError.prototype);

		// Mantém o rastreamento de pilha adequado para onde nosso erro foi gerado.
		// Disponível apenas no V8.
		if (Error.captureStackTrace) {
			Error.captureStackTrace(this, ErrorFactory.prototype.create);
		}
	}
}

const PATTERN = /\{\$([^}]+)}/g;

function replaceTemplate(template: string, data: ErrorData): string {
	return template.replace(PATTERN, (_, key) => {
		const value = data[key];
		return value != null ? String(value) : `<${key}?>`;
	});
}

export class ErrorFactory<ErrorCode extends string, ErrorParams extends { readonly [K in ErrorCode]?: ErrorData } = {}> {
	constructor(private readonly service: string, private readonly serviceName: string, private readonly errors: ErrorMap<ErrorCode>) {}

	create<K extends ErrorCode>(code: K, ...data: K extends keyof ErrorParams ? [ErrorParams[K]] : []): MainError {
		const customData = (data[0] as ErrorData) || {};
		const fullCode = `${this.service}/${code}`;
		const template = this.errors[code];

		const message = template ? replaceTemplate(template, customData) : "Error";
		// Nome do serviço: Mensagem de erro (serviço/código).
		const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;

		const error = new MainError(fullCode, fullMessage, customData);

		return error;
	}
}
