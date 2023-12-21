//require("./MDE/test_main");
//require("./MDE/test_ismael");
//require("./MDE/test_initial_app");

import { initializeApp, getDatabase } from "../src";

const app = initializeApp({
	// port: 8080,
	// isSerer: true,
});

app.ready(async () => {
	console.log("App iniciado!");
	const db = getDatabase(app);

	await db.ref("test").set({ text: "This is my first AceBase test in RunKit" });

	const snap = await db.ref("test/text").get();
	console.log(snap.val());
});
