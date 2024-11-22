import { IvipBaseApp, getApp, getAppsName, getFirstApp } from "../app";
import fs from "fs";
import { EmailRequest, ServerEmailServerSettings } from "./browser";
import { ServerEmailSettings } from "./ServerEmailSettings";
import { DatabaseSettings } from "../app/settings/browser";
import type { RulesData } from "../database/services/rules";

export { EmailRequest, InitialServerEmailSettings, ServerEmailServerSettings } from "./browser";

export class Local {
	constructor(readonly app: IvipBaseApp) {}

	get localPath() {
		return this.app.settings.localPath;
	}

	defineRules(bdName: string): RulesData | undefined {
		try {
			const filePath = `${this.localPath}/${bdName}/rules.json`;
			const defaultFile = `${this.localPath}/rules.json`;
			const path = fs.existsSync(filePath) ? filePath : fs.existsSync(defaultFile) ? defaultFile : undefined;

			if (path) {
				return JSON.parse(fs.readFileSync(path).toString());
			}
		} catch {}

		return;
	}

	dataBaseSettings(bdName: string): DatabaseSettings | undefined {
		try {
			const filePath = `${this.localPath}/${bdName}/database.json`;
			const defaultFile = `${this.localPath}/database.json`;
			const path = fs.existsSync(filePath) ? filePath : fs.existsSync(defaultFile) ? defaultFile : undefined;

			if (path) {
				const options = JSON.parse(fs.readFileSync(path).toString()) as DatabaseSettings;

				if (options.name !== bdName) {
					return;
				}

				options.defineRules = this.defineRules(bdName);
				return options;
			}
		} catch {}
	}

	emailSettings(bdName: string) {
		try {
			const filePath = `${this.localPath}/${bdName}/email.json`;
			const defaultFile = `${this.localPath}/email.json`;
			const path = fs.existsSync(filePath) ? filePath : fs.existsSync(defaultFile) ? defaultFile : undefined;

			if (path) {
				const { models = {}, ...options } = JSON.parse(fs.readFileSync(path).toString()) as Partial<
					ServerEmailServerSettings & {
						models: Partial<{
							[k in EmailRequest["type"]]:
								| {
										title?: string;
										subject?: string;
										message: string;
								  }
								| string
								| undefined;
						}>;
					}
				>;

				if (typeof options.host === "string" && typeof options.port === "number" && typeof options.user === "string" && typeof options.pass === "string") {
					return new ServerEmailSettings({
						server: options as any,
						prepareModel(request) {
							if (request.type in models) {
								const model = models[request.type];

								if (typeof model === "string") {
									return {
										title: "",
										subject: "",
										message: model,
									};
								} else if (typeof model === "object") {
									const { title = "", subject, message } = model;
									return {
										title,
										subject: subject ?? title,
										message,
									};
								}
							}

							return {
								title: "",
								subject: "",
								message: "",
							};
						},
					});
				}
			}
		} catch {}

		return;
	}
}

export function getLocal(): Local;
export function getLocal(app: string | IvipBaseApp | undefined): Local;
export function getLocal(...args: any[]): Local {
	let app: IvipBaseApp | undefined = args.find((a) => a instanceof IvipBaseApp);
	const appNames = getAppsName();

	if (!app) {
		const name = appNames.find((n) => args.includes(n));
		app = name ? getApp(name) : getFirstApp();
	}

	if (!app.local) {
		app.local = new Local(app);
	}
	return app.local;
}
