//require("./MDE/test_main");
//require("./MDE/test_ismael");
//require("./MDE/test_initial_app");

const { initializeApp, getDatabase } = require("../src");

const app = initializeApp({
	// port: 8080,
	// isSerer: true,
});

app.ready(async () => {
	console.log("App iniciado!");
	try {
		const db = getDatabase(app);

		await db.ref("test").set({ text: "This is my first AceBase test in RunKit" });

		const snap = await db.ref("test/text").get();
		console.log(`value of "test/text": ` + snap.val());
	} catch (e) {
		console.log(e);
	}
});
