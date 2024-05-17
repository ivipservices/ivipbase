export const addRoute = (env) => {
    env.router.get(`/stats/:dbName`, async (req, res) => {
        // Get database stats
        try {
            const stats = (await env.db(req.params["dbName"]).storage.stats());
            res.send(stats);
        }
        catch (err) {
            res.statusCode = 500;
            res.send(err.message);
        }
    });
};
export default addRoute;
//# sourceMappingURL=stats.js.map