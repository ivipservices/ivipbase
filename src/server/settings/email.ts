import { ServerEmailServerSettings, EmailRequest } from "../../types";

export interface ServerEmailSettings {
	/** NOT IMPLEMENTED YET - Use send property for your own implementation */
	server?: ServerEmailServerSettings;

	/** function to call when an e-mail needs to be sent */
	send: (request: EmailRequest) => Promise<void>;
}
