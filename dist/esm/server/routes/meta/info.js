import * as os from "os";
import si from "systeminformation";
let time;
const getCpuUsage = () => {
    return new Promise(async (resolve, reject) => {
        try {
            const currentLoad = await si.currentLoad();
            resolve(parseFloat(currentLoad.currentLoad.toFixed(2)));
            // require("os-utils").cpuUsage((percent: any) => {
            // 	resolve(parseFloat(((percent ?? 0) * 100).toFixed(2))); // Convertendo para porcentagem
            // });
        }
        catch {
            resolve(0);
        }
    });
};
export const addRoute = (env) => {
    clearInterval(time);
    const getInfoMoment = async () => {
        const d = new Date();
        const stats = await env.getLogBytesUsage();
        const cpuUsage = await getCpuUsage();
        const mem = await si.mem();
        const netStats = await si.networkStats();
        const previousStats = netStats[1] ?? { ms: 0, rx_bytes: 0, tx_bytes: 0 };
        const currentStats = netStats[0] ?? { ms: 0, rx_bytes: 0, tx_bytes: 0 };
        const deltaTime = (currentStats.ms - previousStats.ms) / 1000;
        const rxSec = (currentStats.rx_bytes - previousStats.rx_bytes) / deltaTime;
        const txSec = (currentStats.tx_bytes - previousStats.tx_bytes) / deltaTime;
        return {
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
                const a = d.stats["__default__"] ?? { request: 0, response: 0 };
                const b = d.stats[dbname] ?? { request: 0, response: 0 };
                return {
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
            info = {
                ...info,
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
                        arrayBuffers: numberToByteSize(mem.arrayBuffers), // arrayBuffers was added in Node v13.9.0, v12.17.0
                        external: numberToByteSize(mem.external),
                        heapTotal: numberToByteSize(mem.heapTotal),
                        heapUsed: numberToByteSize(mem.heapUsed),
                        residentSet: numberToByteSize(mem.rss),
                    },
                },
                cpus: os.cpus(),
                network: os.networkInterfaces(),
            };
        }
        // for (let i = 0; i < 1000000000; i++) {
        //     let j = Math.pow(i, 2);
        // }
        res.send(info);
    });
};
export default addRoute;
//# sourceMappingURL=info.js.map