//require("./MDE/test_main");
//require("./MDE/test_ismael");
//require("./MDE/test_initial_app");

import { initializeApp, getDatabase, getIPCPeer, DataStorageSettings, JsonFileStorageSettings, SqliteSettings, SequelizeSettings, MongodbSettings, getStorage, PathInfo } from "../src";

import dirname from "../src/utils/es-dirname";

import cluster from "cluster";
import fs from "fs";
import path from "path";

(() => {
	// if (cluster.isMaster) {
	// 	console.log(`Master ${process.pid} is running`);

	// 	// Fork workers.
	// 	for (let i = 0; i < 4; i++) {
	// 		cluster.fork();
	// 	}

	// 	cluster.on("exit", (worker, code, signal) => {
	// 		console.log("worker %d died (%s). restarting...", worker.process.pid, signal || code);
	// 		cluster.fork();
	// 	});

	// 	getIPCPeer();
	// } else {
	// 	console.log(`Initializing app on ${process.pid}`);

	const app = initializeApp({
		port: 8080,
		isServer: true,
		database: [
			{
				name: "root",
				description: "Root database",
			},
			{
				name: "development",
				description: "Development database",
			},
			{
				name: "production",
				description: "Production database",
			},
		],
		// storage: new JsonFileStorageSettings({
		// 	filePath: "./test_file.json",
		// }),
		authentication: {
			enabled: true,
			defaultAdminPassword: "admin",
		},
		defineRules: {
			rules: {
				users: {
					$uid: {
						".read": "auth.uid === $uid",
						".write": "auth.uid === $uid",
					},
				},
			},
		},
	});

	app.ready(async () => {
		const db = getDatabase(app);
		console.log("Database ready!");

		// fs.readFile(path.join(dirname(), "paths.txt"), (err, data) => {
		// 	getStorage().ref("file-teste").put(data, { contentType: "text/plain" });
		// });

		// db.ref("__auth__/accounts")
		// 	.query()
		// 	.filter("username", "==", "admin")
		// 	.sort("created", true)
		// 	.get()
		// 	.then((snaps) => {
		// 		if (snaps.length <= 0) {
		// 			console.log("Não encontrado!");
		// 			return;
		// 		}
		// 		const snap = snaps[0];
		// 		console.log(snap.val());
		// 	})
		// 	.catch(console.log);

		// db.ref("test").on("child_added", (snap) => console.log("child_added", snap.ref.path, snap.val()));
		// db.ref("test").on("child_changed", (snap) => console.log("child_changed", snap.ref.path, snap.val()));
		// db.ref("test").on("child_removed", (snap) => console.log("child_removed", snap.ref.path, snap.val()));
		// db.ref("test").on("mutated", (snap) => console.log("mutated", snap.ref.path, snap.val()));
		// db.ref("test").on("mutations", (snap) => console.log("mutations", snap.ref.path, snap.val()));
		// db.ref("test").on("value", (snap) => console.log("value", snap.ref.path, snap.val()));

		// db.ref("test")
		// 	.observe()
		// 	.subscribe((val) => {
		// 		console.log("observe: ", val);
		// 	});

		// await db.ref("test").set({ text: "This is my first iVipCoin test in RunKit" });

		// await db
		// 	.ref("test/text")
		// 	.get()
		// 	.then((snap) => {
		// 		console.log(snap.val());
		// 	});

		// await db.ref("test").update({
		// 	type: "deposit",
		// 	wallet_type:
		// 		"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
		// 	payment_method: "bolbradesco",
		// 	original_amount: 603,
		// 	total_amount: [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }],
		// 	id: 1311772470,
		// 	operation_type: "regular_payment",
		// 	payment_type: "ticket",
		// 	created: new Date(),
		// 	status: {
		// 		payment_method:
		// 			"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
		// 		original_amount: 603,
		// 		total_amount: 606.49,
		// 		id: [
		// 			{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 },
		// 			{ title: "Taxa de serviço", label: "Taxa de R$ 4,00", amount: 4 },
		// 		],
		// 		operation_type: "regular_payment",
		// 		payment_type: "ticket",
		// 		currency_id: "BRL",
		// 		history_id: "1677138262468",
		// 		striue50:
		// 			"Valor da string maior Valor Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres... da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres...",
		// 	},
		// 	status_detail: "pending_waiting_payment",
		// 	currency_id: "BRL",
		// 	history_id: "1677138262468",
		// });

		// await db.ref("test").update({ text: null });
		// await db
		// 	.ref("test/text")
		// 	.get()
		// 	.then((snap) => {
		// 		console.log(snap.val());
		// 	});

		// setTimeout(async () => {
		// 	snap = await db.ref("test").get();
		// 	console.log(JSON.stringify(snap.val(), null, 4));
		// }, 1000);

		// const exists = await db.ref("test").exists();
		// console.log("Exists", exists);
	});
	// }
})();
