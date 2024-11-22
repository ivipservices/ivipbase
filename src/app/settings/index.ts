import { ServerSettings, isPossiblyServer } from "../../server";
import { IvipBaseSettings as BrowserSettings, IvipBaseSettingsOptions } from "./browser";

export class IvipBaseSettings extends BrowserSettings {
	public isValidClient: boolean = false;
	public server?: ServerSettings;
	public localPath: string = "";

	constructor(readonly options: Partial<IvipBaseSettingsOptions> = {}) {
		super(options);
		this.reset(options, false);
	}

	get isPossiplyServer() {
		return true;
	}

	reset(options: Partial<IvipBaseSettingsOptions> = {}, forceSuper: boolean = true) {
		if (forceSuper) {
			super.reset(options);
		}

		if (options.isServer && isPossiblyServer) {
			this.server = new ServerSettings(options);
			this.localPath = options.localPath ?? "";
			this.isValidClient = false;
		}
	}
}
