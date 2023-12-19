"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.ErrorFactory = exports.MainError = void 0;
const ERROR_NAME = "iVipBaseError";
class MainError extends Error {
    constructor(
    /** O código de erro para este erro. */
    code, message, 
    /** Dados personalizados para este erro. */
    customData) {
        super(message);
        this.code = code;
        this.customData = customData;
        /** O nome personalizado para todos os iVipBaseError. */
        this.name = ERROR_NAME;
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
exports.MainError = MainError;
const PATTERN = /\{\$([^}]+)}/g;
function replaceTemplate(template, data) {
    return template.replace(PATTERN, (_, key) => {
        const value = data[key];
        return value != null ? String(value) : `<${key}?>`;
    });
}
class ErrorFactory {
    constructor(service, serviceName, errors) {
        this.service = service;
        this.serviceName = serviceName;
        this.errors = errors;
    }
    create(code, ...data) {
        const customData = data[0] || {};
        const fullCode = `${this.service}/${code}`;
        const template = this.errors[code];
        const message = template ? replaceTemplate(template, customData) : "Error";
        // Nome do serviço: Mensagem de erro (serviço/código).
        const fullMessage = `${this.serviceName}: ${message} (${fullCode}).`;
        const error = new MainError(fullCode, fullMessage, customData);
        return error;
    }
}
exports.ErrorFactory = ErrorFactory;
//# sourceMappingURL=util.js.map