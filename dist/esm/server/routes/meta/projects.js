export const addRoute = (env) => {
    env.router.get(`/projects`, async (req, res) => {
        const dbs = env.dbNames;
        const list = [];
        for (const db of dbs) {
            const dbInfo = env.db(db);
            list.push({
                name: db,
                description: dbInfo.description ?? "No description",
                type: "database",
            });
        }
        res.send(list);
    });
};
export default addRoute;
//# sourceMappingURL=projects.js.map