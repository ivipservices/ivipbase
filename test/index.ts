//import { DataBase, Auth, Storage } from "../src/server";
import { SimpleEventEmitter } from "ivipbase-core";

import { MongoClient, ChangeStream, ChangeStreamInsertDocument, ChangeStreamDeleteDocument, ChangeStreamUpdateDocument, Collection, Db } from "mongodb";

// class MongoDBChangeStreamEmitter extends SimpleEventEmitter {
// 	private client: MongoClient;
// 	public readonly collection: Promise<Collection>;
// 	private changeStream: Promise<ChangeStream>;

// 	constructor(uri: string, dbName: string, collectionName: string) {
// 		super();
// 		this.client = new MongoClient(uri);

// 		this.collection = this.client
// 			.connect()
// 			.then(() => {
// 				const db = this.client.db(dbName);
// 				return db.collection(collectionName);
// 			})
// 			.catch((err) => {
// 				this.emit("error", err);
// 				throw err;
// 			});

// 		this.changeStream = this.collection
// 			.then((collection) => {
// 				return collection.watch();
// 			})
// 			.catch((err) => {
// 				this.emit("error", err);
// 				throw err;
// 			});

// 		this.setupChangeStreamListeners();

// 		Promise.all([this.collection, this.changeStream])
// 			.then(() => {
// 				this.emit("ready", this);
// 			})
// 			.catch((error) => {
// 				this.emit("error", error);
// 			});
// 	}

// 	private setupChangeStreamListeners() {
// 		this.changeStream.then((stream) => {
// 			stream.on("change", (change) => {
// 				let event = "added";
// 				let newData: any = null;
// 				let beforeData: any = null;

// 				switch (change.operationType) {
// 					case "insert":
// 						event = "added";
// 						newData = (change as ChangeStreamInsertDocument).fullDocument;
// 						break;
// 					case "delete":
// 						event = "removed";
// 						beforeData = (change as ChangeStreamDeleteDocument).fullDocumentBeforeChange;
// 						break;
// 					case "modify":
// 					case "update":
// 						event = "mutated";
// 						newData = (change as ChangeStreamUpdateDocument).fullDocument;
// 						beforeData = (change as ChangeStreamUpdateDocument).fullDocumentBeforeChange;
// 						break;
// 				}

// 				this.emit(event, { newData, beforeData });
// 				this.emit("change", { newData, beforeData });
// 			});
// 		});
// 	}

// 	on(event: "added" | "mutated" | "removed" | "change" | "ready" | "error", listener: (data: any) => void): any;
// 	on(event: string, listener: (data: any) => void): any {
// 		return super.on(event, listener);
// 	}

// 	off(event: "added" | "mutated" | "removed" | "change" | "ready" | "error", listener: (data: any) => void): any;
// 	off(event: string, listener: (data: any) => void): any {
// 		return super.off(event, listener);
// 	}

// 	close() {
// 		this.client.close();
// 	}
// }

// new MongoDBChangeStreamEmitter("mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048", "teste", "forWatch").on("ready", (db) => {
// 	const collection = db.collection;

// 	db.on("change", function (change) {
// 		console.log(change);
// 	});

// 	setTimeout(function () {
// 		collection.insertOne({ batman: "bruce wayne" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 1000);

// 	setTimeout(function () {
// 		collection.insertOne({ superman: "clark kent" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 2000);

// 	setTimeout(function () {
// 		collection.insertOne({ "wonder-woman": "diana prince" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 3000);

// 	setTimeout(function () {
// 		collection.insertOne({ ironman: "tony stark" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 4000);

// 	setTimeout(function () {
// 		collection.insertOne({ spiderman: "peter parker" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 5000);

// 	// update existing document
// 	setTimeout(function () {
// 		collection.updateOne({ ironman: "tony stark" }, { $set: { ironman: "elon musk" } }, function (err) {
// 			console.log(err);
// 		});
// 	}, 6000);

// 	// delete existing document
// 	setTimeout(function () {
// 		collection.deleteOne({ spiderman: "peter parker" }, function (err) {
// 			console.log(err);
// 		});
// 	}, 7000);
// });

// const password = "9Hq91q5oExU9biOZ7yq98I8P1DU1ge";

// const db = new SyncMongoServer("ivipcoin-db", {
// 	host: "127.0.0.1",
// 	port: 4048,
// 	maxPayloadSize: "50mb",
// 	authentication: {
// 		enabled: true,
// 		allowUserSignup: true,
// 		defaultAccessRule: "auth",
// 		defaultAdminPassword: password,
// 	},
// 	mongodb: {
// 		host: "ivipcoin-api.com",
// 		port: 4048,
// 		username: "gestor",
// 		password: password,
// 		database: "root",
// 	},
// });

import Node from "../src/server/services/database/Node";
// import fs from "fs";
// import path from "path";

// const data = new Node();

// const dataJson = fs.readFileSync(path.resolve(__dirname, "./__movement_wallet__.json"), "utf8");

// data.importJson("ivipcoin-db::__movement_wallet__", JSON.parse(dataJson));

// console.log(data.getInfoBy("ivipcoin-db::__movement_wallet__/000523147298669313", { include_child_count: true }));

// fs.writeFileSync(path.resolve(__dirname, "./myjsonfile.json"), JSON.stringify(data.getNodesBy("ivipcoin-db::__movement_wallet__")), "utf8");

(async () => {
	const client: MongoClient = await MongoClient.connect("mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048");
	const db: Db = client.db("root");
	const collection: Collection = db.collection("ivipcoin-db");

	console.log(new Date().toLocaleString("pt-BR"));

	const path: string = "ivipcoin-db::__movement_wallet__/000523147298669313/history/*";

	// Substitua * por .* na pesquisa para corresponder a qualquer valor
	// const pathRegex = path.replace(/\/((\*)|(\$[^/\$]*))/g, "/([^/]*)");

	// Construa a consulta com base no caminho (path) fornecido
	// const query = {
	// 	path: {
	// 		$regex: new RegExp(`^${pathRegex}(/([^/]*))?$`),
	// 	},
	// };

	// Execute a consulta e retorne os resultados
	//const result = await collection.find(query).toArray();

	//console.log(result.map(({ path }) => path));

	const data = new Node([], {
		async dataSynchronization(path, type, nodes) {
			console.log(path);
			if (type === "get") {
				const result = await (collection
					.find({
						path: {
							$regex: path,
						},
					})
					.toArray() as Promise<any[]>);

				console.log(result.length);

				return result;
			}

			return [];
		},
	});

	await data.synchronize(path, false);

	console.log(new Date().toLocaleString("pt-BR"));

	console.log(data.setNode("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", "USD- test"));
	console.log(data.setNode("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id_olt", "BRL- test"));

	console.log(
		data.getInfoBy("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788", {
			include_child_count: true,
		}),
	);

	console.log(new Date().toLocaleString("pt-BR"));
})();
