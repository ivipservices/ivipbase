import * as os from "os";
import si from "systeminformation";
let time;
const getCpuUsage = () => {
    return new Promise((resolve, reject) => {
        try {
            require("os-utils").cpuUsage((percent) => {
                resolve(parseFloat(((percent ?? 0) * 100).toFixed(2))); // Convertendo para porcentagem
            });
        }
        catch {
            resolve(0);
        }
    });
};
const getInfoMoment = async () => {
    const d = new Date();
    const cpuUsage = await getCpuUsage();
    const mem = await si.mem();
    const netStats = await si.networkStats();
    return {
        cpuUsage: cpuUsage,
        networkStats: netStats.reduce((c, stats) => {
            c.sent += stats.tx_bytes;
            c.received += stats.rx_bytes;
            return c;
        }, {
            sent: 0,
            received: 0,
        }),
        memoryUsage: {
            total: mem.total,
            free: mem.free,
            used: mem.used,
        },
        timestamp: d.getTime(),
    };
};
export const addRoute = (env) => {
    clearInterval(time);
    time = setInterval(async () => {
        const d = await getInfoMoment();
        env.metaInfoCache.set(d.timestamp, d);
    }, 10000);
    getInfoMoment().then((d) => {
        env.metaInfoCache.set(d.timestamp, d);
    });
    // Add info endpoint
    env.router.get(`/info/:dbName`, async (req, res) => {
        let info = {
            dbname: req.params["dbName"],
            version: env.settings.serverVersion,
            time: Date.now(),
            process: process.pid,
        };
        if (req.user && req.user.permission_level >= 2) {
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
                data: env.metaInfoCache.values(),
            };
            adminInfo.data.sort((a, b) => {
                return a.timestamp - b.timestamp;
            });
            info = { ...info, ...adminInfo };
        }
        // for (let i = 0; i < 1000000000; i++) {
        //     let j = Math.pow(i, 2);
        // }
        res.send(info);
    });
};
export default addRoute;
//# sourceMappingURL=info.js.map