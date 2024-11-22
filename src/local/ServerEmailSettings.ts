import NodeMailer from "nodemailer";
import juice from "juice";
import { EmailRequest, InitialServerEmailSettings, ServerEmailServerSettings } from "./browser";

type TemplateMailerActionsValue = string | number | boolean | TemplateMailerActions | (() => string | number | boolean);

interface TemplateMailerActions {
	[k: string]: TemplateMailerActionsValue;
}

const getTemplateValueBy = (str: string, actions: TemplateMailerActions): string => {
	str = String(!str || String(str).trim() === "" ? "" : str);
	actions = !actions || typeof actions !== "object" ? {} : actions;
	const expression = /\{\{(([a-z0-9_\-]+\.?)+)\}\}/i;

	if (expression.test(str) !== true) {
		return str;
	}

	let path = (str ?? "").match(expression)?.[1];

	if (path) {
		let value: TemplateMailerActionsValue | null = actions;

		path.split(".").forEach((key, i) => {
			value = value && typeof value === "object" && key in value ? value[key] : null;
		});

		value = typeof value === "function" ? (value as any)() : ["string", "number", "boolean"].includes(typeof value) ? value : "[[ERROR]]";
		str = str.replace(new RegExp("{{" + path + "}}", "gi"), (value as any) ?? "");
	}

	return getTemplateValueBy(str, actions);
};

export class ServerEmailSettings {
	readonly server: ServerEmailServerSettings;
	protected transporter: NodeMailer.Transporter;
	readonly prepareModel: (request: EmailRequest) =>
		| {
				title: string;
				subject: string;
				message: string;
		  }
		| undefined = (request) => {
		let title: string = "iVipBase";
		let subject: string = "";
		let message: string = "";

		try {
		} catch {}

		return { title, subject, message };
	};

	constructor(options: InitialServerEmailSettings) {
		this.server = options.server;

		if (typeof options.prepareModel === "function") {
			this.prepareModel = options.prepareModel;
		}

		this.transporter = NodeMailer.createTransport({
			host: this.server.host,
			port: this.server.port,
			secure: this.server.secure,
			auth: {
				user: this.server.user,
				pass: this.server.pass,
			},
		});
	}

	/** Função a ser chamada quando um e-mail precisa ser enviado */
	async send(request: EmailRequest): Promise<void> {
		const { title, subject, message } = this.prepareModel(request) ?? {
			title: "iVipBase",
			subject: "",
			message: "",
		};

		if (message.trim() === "") {
			return;
		}

		await this.transporter.sendMail({
			priority: "high",
			from: `${title} <${this.server.user}>`,
			to: request.user.email,
			subject: subject,
			text: subject,
			html: juice(getTemplateValueBy(message, request as any), { removeStyleTags: false }),
		});
	}
}
