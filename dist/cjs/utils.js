"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.encodeURIComponent = void 0;
const encodeURIComponent = (value) => {
    const hexChars = '0123456789ABCDEF';
    let encodedValue = '';
    for (let i = 0; i < value.length; i++) {
        const char = value.charAt(i);
        if (/[A-Za-z0-9\-_.~]/.test(char) || ['!', '\'', '(', ')', '*', ','].includes(char)) {
            encodedValue += char;
        }
        else {
            const charCode = char.charCodeAt(0);
            encodedValue += `%${hexChars[(charCode >> 4) & 0x0f]}${hexChars[charCode & 0x0f]}`;
        }
    }
    return encodedValue;
};
exports.encodeURIComponent = encodeURIComponent;
//# sourceMappingURL=utils.js.map