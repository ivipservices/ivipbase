import path from "path";
import { platform } from "os";
export default () => {
    try {
        throw new Error();
    }
    catch (e) {
        const initiator = e.stack.split("\n").slice(2, 3)[0];
        let p = /(?<path>[^\(\s]+):[0-9]+:[0-9]+/.exec(initiator)?.groups?.path ?? "";
        if (p.indexOf("file") >= 0) {
            p = new URL(p).pathname;
        }
        let dirname = path.dirname(p);
        if (dirname[0] === "/" && platform() === "win32") {
            dirname = dirname.slice(1);
        }
        return dirname;
    }
};
//# sourceMappingURL=es-dirname.js.map