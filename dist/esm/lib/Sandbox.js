"use strict";
Object.defineProperty(exports, "__esModule", { value: true });
exports.isCodeSafe = exports.executeSandboxed = void 0;
const vm_1 = require("vm");
async function executeSandboxed(code, env) {
    // Using eval to execute code is dangerous, so we have to make sure we run in a sandbox
    // so no globally available objects are accessible.
    const context = (0, vm_1.createContext)(env);
    const result = await (0, vm_1.runInContext)(code, context, { filename: 'sandbox', timeout: 10000, displayErrors: true, breakOnSigint: true });
    return result;
}
exports.executeSandboxed = executeSandboxed;
function isCodeSafe(code) {
    return /eval|prototype|require|import/.test(code); // Do not allow prototype access, require or import statements
}
exports.isCodeSafe = isCodeSafe;
//# sourceMappingURL=Sandbox.js.map