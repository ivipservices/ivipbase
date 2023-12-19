import { initializeApp, JsonFileStorageSettings, getDatabase } from "../../src";

const app = initializeApp({
	storage: new JsonFileStorageSettings({
		filePath: "../myjsonfile.json",
	}),
});

const db = getDatabase(app);

db.ref("Users")
	.child("089802472748728934")
	.get()
	.then((snap) => {
		console.log(snap.val());
	})
	.catch(console.log);
