//require("./MDE/test_main");
//require("./MDE/test_ismael");
//require("./MDE/test_initial_app");

import { initializeApp, getDatabase, DataStorageSettings, JsonFileStorageSettings } from "../src";

const app = initializeApp({
	port: 8080,
	isServer: true,
	storage: new JsonFileStorageSettings({
		filePath: "./test_file.json",
	}),
});

app.ready(async () => {
	console.log("App iniciado!");
	const db = getDatabase(app);

	console.log(`Database ${db.name} iniciado!`);

	// db.ref("test").on("child_added", (snap) => console.log("child_added", snap.ref.path, snap.val()));
	// db.ref("test").on("child_changed", (snap) => console.log("child_changed", snap.ref.path, snap.val()));
	// db.ref("test").on("child_removed", (snap) => console.log("child_removed", snap.ref.path, snap.val()));
	// db.ref("test").on("mutated", (snap) => console.log("mutated", snap.ref.path, snap.val()));
	// db.ref("test").on("mutations", (snap) => console.log("mutations", snap.ref.path, snap.val()));
	// db.ref("test").on("value", (snap) => console.log("value", snap.ref.path, snap.val()));

	// db.ref("test")
	// 	.observe()
	// 	.subscribe((val) => {
	// 		console.log("text: ", val.text);
	// 	});

	// await db.ref("test").set({ text: "This is my first iVipCoin test in RunKit" });

	// let snap = await db.ref("test/text").get();
	// //console.log(snap.val());

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

	// setTimeout(async () => {
	// 	snap = await db.ref("test").get();
	// 	console.log(JSON.stringify(snap.val(), null, 4));
	// }, 1000);

	// const exists = await db.ref("test").exists();
	// console.log("Exists", exists);
});
