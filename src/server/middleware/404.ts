import { LocalServer } from "../";

/**
 * Adds 404 middleware. This binds to `env.app` so routes added to `env.router` always come first, even if they are added after the 404 handler
 * @param env
 */
export const addMiddleware = (env: LocalServer) => {
	env.app.use((req, res, next) => {
		res.status(404).send("Not Found");
	});
};

export default addMiddleware;
