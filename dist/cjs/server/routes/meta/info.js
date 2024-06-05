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
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
exports.addRoute = void 0;
const os = __importStar(require("os"));
const systeminformation_1 = __importDefault(require("systeminformation"));
let time;
const getCpuUsage = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const currentLoad = await systeminformation_1.default.currentLoad();
            resolve(parseFloat(currentLoad.currentLoad.toFixed(2)));
            // require("os-utils").cpuUsage((percent: any) => {
            // 	resolve(parseFloat(((percent ?? 0) * 100).toFixed(2))); // Convertendo para porcentagem
            // });
        }
        catch (_a) {
            resolve(0);
        }
    });
};
const addRoute = (env) => {
    clearInterval(time);
    let users = {};
    env.on("userConnect", (data) => {
        if (!Array.isArray(data.dbNames) || data.dbNames.length <= 0) {
            return;
        }
        for (let dbName of data.dbNames) {
            if (!users[dbName]) {
                users[dbName] = {
                    connections: 0,
                    disconnections: 0,
                };
            }
            users[dbName].connections++;
        }
    });
    env.on("userDisconnect", (data) => {
        if (!Array.isArray(data.dbNames) || data.dbNames.length <= 0) {
            return;
        }
        for (let dbName of data.dbNames) {
            if (!users[dbName]) {
                users[dbName] = {
                    connections: 0,
                    disconnections: 0,
                };
            }
            users[dbName].disconnections++;
        }
    });
    const getInfoMoment = async () => {
        var _a, _b;
        const d = new Date();
        const stats = await env.getLogBytesUsage();
        const cpuUsage = await getCpuUsage();
        const mem = await systeminformation_1.default.mem();
        const netStats = await systeminformation_1.default.networkStats();
        const previousStats = (_a = netStats[1]) !== null && _a !== void 0 ? _a : { ms: 0, rx_bytes: 0, tx_bytes: 0 };
        const currentStats = (_b = netStats[0]) !== null && _b !== void 0 ? _b : { ms: 0, rx_bytes: 0, tx_bytes: 0 };
        const deltaTime = (currentStats.ms - previousStats.ms) / 1000;
        const rxSec = (currentStats.rx_bytes - previousStats.rx_bytes) / deltaTime;
        const txSec = (currentStats.tx_bytes - previousStats.tx_bytes) / deltaTime;
        const _users = users;
        for (const dbName in users) {
            users[dbName].connections -= users[dbName].disconnections;
            users[dbName].disconnections = 0;
        }
        return {
            users: _users,
            stats,
            cpuUsage: cpuUsage,
            networkStats: {
                sent: txSec,
                received: rxSec,
            },
            memoryUsage: {
                total: mem.total,
                free: mem.free,
                used: mem.used,
            },
            timestamp: d.getTime(),
        };
    };
    time = setInterval(async () => {
        const d = await getInfoMoment();
        env.metaInfoCache.set(d.timestamp, d);
    }, 10000);
    getInfoMoment().then((d) => {
        env.metaInfoCache.set(d.timestamp, d);
    });
    // Add info endpoint
    env.router.get(`/info/:dbName`, async (req, res) => {
        const dbname = req.params["dbName"];
        let info = {
            dbname,
            version: env.settings.serverVersion,
            time: Date.now(),
            process: process.pid,
            platform: "",
            arch: "",
            release: "",
            host: "",
            uptime: "",
            load: [],
            mem: {
                total: "0MB",
                free: "0MB",
                process: {
                    arrayBuffers: "0MB",
                    external: "0MB",
                    heapTotal: "0MB",
                    heapUsed: "0MB",
                    residentSet: "0MB",
                },
            },
            cpus: [],
            network: {},
            data: [],
        };
        if (req.user && req.user.permission_level >= 1) {
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
            const data = env.metaInfoCache.values();
            info.data = data.map((d) => {
                var _a, _b, _c;
                const a = (_a = d.stats["__default__"]) !== null && _a !== void 0 ? _a : { request: 0, response: 0 };
                const b = (_b = d.stats[dbname]) !== null && _b !== void 0 ? _b : { request: 0, response: 0 };
                return {
                    users: (_c = d.users[dbname]) !== null && _c !== void 0 ? _c : { connections: 0, disconnections: 0 },
                    stats: { request: a.request + b.request, response: a.response + b.response },
                    cpuUsage: d.cpuUsage,
                    networkStats: d.networkStats,
                    memoryUsage: d.memoryUsage,
                    timestamp: d.timestamp,
                };
            });
            info.data.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });
            info = Object.assign(Object.assign({}, info), { platform: os.platform(), arch: os.arch(), release: os.release(), host: os.hostname(), uptime: numberToTime(os.uptime()), load: os.loadavg(), mem: {
                    total: numberToByteSize(os.totalmem()),
                    free: numberToByteSize(os.freemem()),
                    process: {
                        arrayBuffers: numberToByteSize(mem.arrayBuffers), // arrayBuffers was added in Node v13.9.0, v12.17.0
                        external: numberToByteSize(mem.external),
                        heapTotal: numberToByteSize(mem.heapTotal),
                        heapUsed: numberToByteSize(mem.heapUsed),
                        residentSet: numberToByteSize(mem.rss),
                    },
                }, cpus: os.cpus(), network: os.networkInterfaces() });
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