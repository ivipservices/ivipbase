"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const os = __importStar(require("os"));
const SERVER_VERSION = "%SERVER_VERSION%"; // Loaded from package.json by npm scripts
const addRoute = (env) => {
    // Add info endpoint
    env.router.get(`/info/${env.db.name}`, (req, res) => {
        const info = {
            version: SERVER_VERSION,
            time: Date.now(),
            process: process.pid,
        };
        if (req.user && req.user.uid === "admin") {
            const numberToByteSize = (number) => {
                return Math.round((number / 1024 / 1024) * 100) / 100 + "MB";
            };
            const sPerMinute = 60;
            const sPerHour = sPerMinute * 60;
            const sPerDay = sPerHour * 24;
            const numberToTime = (number) => {
                const days = Math.floor(number / sPerDay);
                number -= sPerDay * days;
                const hours = Math.floor(number / sPerHour);
                number -= hours * sPerHour;
                const minutes = Math.floor(number / sPerMinute);
                number -= minutes * sPerMinute;
                const seconds = Math.floor(number);
                return `${days}d${hours}h${minutes}m${seconds}s`;
            };
            const mem = process.memoryUsage();
            const adminInfo = {
                dbname: env.db.name,
                platform: os.platform(),
                arch: os.arch(),
                release: os.release(),
                host: os.hostname(),
                uptime: numberToTime(os.uptime()),
                load: os.loadavg(),
                mem: {
                    total: numberToByteSize(os.totalmem()),
                    free: numberToByteSize(os.freemem()),
                    process: {
                        arrayBuffers: numberToByteSize(mem.arrayBuffers),
                        external: numberToByteSize(mem.external),
                        heapTotal: numberToByteSize(mem.heapTotal),
                        heapUsed: numberToByteSize(mem.heapUsed),
                        residentSet: numberToByteSize(mem.rss),
                    },
                },
                cpus: os.cpus(),
                network: os.networkInterfaces(),
            };
            Object.assign(info, adminInfo);
        }
        // for (let i = 0; i < 1000000000; i++) {
        //     let j = Math.pow(i, 2);
        // }
        res.send(info);
    });
};
exports.addRoute = addRoute;
exports.default = exports.addRoute;
//# sourceMappingURL=info.js.map