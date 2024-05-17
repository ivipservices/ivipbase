export const addRoute = (env) => {
    env.router.get(`/ping/:dbName`, (req, res) => {
        // For simple connectivity check
        res.send("pong");
    });
};
export default addRoute;
//# sourceMappingURL=ping.js.map