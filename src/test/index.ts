import { SyncMongoServer } from "../index";

const password = "9Hq91q5oExU9biOZ7yq98I8P1DU1ge";

const db = new SyncMongoServer("ivipcoin-db", {
	host: "127.0.0.1",
	port: 4048,
	maxPayloadSize: "50mb",
	authentication: {
		enabled: true,
		allowUserSignup: true,
		defaultAccessRule: "auth",
		defaultAdminPassword: password,
	},
	mongodb: {
		host: "ivipcoin-api.com",
		port: 4048,
		username: "gestor",
		password: password,
		database: "root",
	},
});
