import { LocalServer } from "../../";

type SimpleStorageStats = {
	writes: number;
	reads: number;
	bytesRead: number;
	bytesWritten: number;
};

export const addRoute = (env: LocalServer) => {
	env.router.get(`/stats/:dbName`, async (req, res) => {
		// Get database stats
		try {
			const stats = (await env.db(req.params["dbName"]).storage.stats()) as SimpleStorageStats;
			res.send(stats);
		} catch (err: any) {
			res.statusCode = 500;
			res.send(err.message);
		}
	});
};

export default addRoute;
