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

let time: NodeJS.Timer;

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
	d.setMilliseconds(0);
	d.setSeconds(0);

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
		time: d.getTime(),
	};
};

export const addRoute = (env: LocalServer) => {
	clearInterval(time);

	time = setInterval(async () => {
		const d = await getInfoMoment();
		env.metaInfoCache.set(d.time, d);
	}, 1000 * 60);

	getInfoMoment().then((d) => {
		env.metaInfoCache.set(d.time, d);
	});

	// Add info endpoint
	env.router.get(`/info/:dbName`, async (req: Request, res) => {
		let info = {
			version: env.settings.serverVersion,
			time: Date.now(),
			process: process.pid,
		};

		if (req.user && req.user.admin_level >= 2) {
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
			const adminInfo: {
				dbname: any;
				platform: NodeJS.Platform;
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
					time: number;
				}>;
			} = {
				dbname: req.params["dbName"],
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
				data: [],
			};

			for (let i = 0; i < 100; i++) {
				const d = new Date();
				d.setMilliseconds(0);
				d.setSeconds(0);
				d.setMinutes(d.getMinutes() - i);

				if (i === 0 && !env.metaInfoCache.has(d.getTime())) {
					getInfoMoment().then((d) => {
						env.metaInfoCache.set(d.time, d);
					});
				}

				adminInfo.data.push(
					env.metaInfoCache.get(d.getTime()) ?? {
						cpuUsage: 0,
						networkStats: {
							sent: 0,
							received: 0,
						},
						memoryUsage: {
							total: 0,
							free: 0,
							used: 0,
						},
						time: d.getTime(),
					},
				);
			}

			adminInfo.data.sort((a, b) => {
				return a.time - b.time;
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
