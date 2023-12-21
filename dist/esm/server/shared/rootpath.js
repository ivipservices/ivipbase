import { resolve } from "path";
// Este arquivo está em ./src/shared/rootpath.ts
// Quando este código é executado, está em ./dist/cjs/shared/rootpath.js ou ./dist/esm/shared/rootpath.js
// Portanto, a raiz do pacote está em ../../..
let currentDir = `${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`;
if (process.platform === "win32" && currentDir.startsWith("/")) {
    // tsc-esm-fix não manipula corretamente as URLs de arquivo win32, a letra da unidade em import.meta.url é prefixada com uma barra: file:///C:/dir/file.js
    currentDir = currentDir.slice(1);
}
// tsc-esm-fix também não usa decodeURI para remover caracteres codificados (como %20 para espaços)
currentDir = decodeURI(currentDir);
export const packageRootPath = resolve(currentDir, "../..");
export default packageRootPath;
//# sourceMappingURL=rootpath.js.map