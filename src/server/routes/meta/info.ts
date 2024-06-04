import { LocalServer, RouteRequest } from "../../";
import * as os from "os";
import osUtil from "os-utils";
import si from "systeminformation";

export type RequestQuery = null;
export type RequestBody = null;
export type ResponseBody = {
	version: string;
	time: number;
	process: number;
};
export type Request = RouteRequest<RequestQuery, RequestBody, ResponseBody>;

let time: NodeJS.Timeout;

const getCpuUsage = (): Promise<number> => {
	return new Promise((resolve, reject) => {
		try {
			require("os-utils").cpuUsage((percent: any) => {
				resolve(parseFloat(((percent ?? 0) * 100).toFixed(2))); // Convertendo para porcentagem
			});
		} catch {
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
		networkStats: netStats.reduce(
			(c, stats) => {
				c.sent += stats.tx_bytes;
				c.received += stats.rx_bytes;
				return c;
			},
			{
				sent: 0,
				received: 0,
			},
		),
		memoryUsage: {
			total: mem.total,
			free: mem.free,
			used: mem.used,
		},
		timestamp: d.getTime(),
	};
};

export const addRoute = (env: LocalServer) => {
	clearInterval(time);

	time = setInterval(async () => {
		const d = await getInfoMoment();
		env.metaInfoCache.set(d.timestamp, d);
	}, 10000);

	getInfoMoment().then((d) => {
		env.metaInfoCache.set(d.timestamp, d);
	});

	// Add info endpoint
	env.router.get(`/info/:dbName`, async (req: Request, res) => {
		let info: {
			dbname: string;
			version: string;
			time: number;
			process: number;
			platform: string;
			arch: string;
			release: string;
			host: string;
			uptime: string;
			load: number[];
			mem: {
				total: string;
				free: string;
				process: {
					arrayBuffers: string;
					external: string;
					heapTotal: string;
					heapUsed: string;
					residentSet: string;
				};
			};
			cpus: ReturnType<typeof os.cpus>;
			network: ReturnType<typeof os.networkInterfaces>;
			data: Array<{
				cpuUsage: number;
				networkStats: {
					sent: number;
					received: number;
				};
				memoryUsage: { total: number; free: number; used: number };
				timestamp: number;
			}>;
		} = {
			dbname: req.params["dbName"],
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
			const numberToByteSize = (number: number) => {
				return Math.round((number / 1024 / 1024) * 100) / 100 + "MB";
			};
			const sPerMinute = 60;
			const sPerHour = sPerMinute * 60;
			const sPerDay = sPerHour * 24;
			const numberToTime = (number: number) => {
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

			info.data = env.metaInfoCache.values();
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
						arrayBuffers: numberToByteSize((mem as any).arrayBuffers), // arrayBuffers was added in Node v13.9.0, v12.17.0
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
		}
		// for (let i = 0; i < 1000000000; i++) {
		//     let j = Math.pow(i, 2);
		// }
		res.send(info);
	});
};

export default addRoute;
