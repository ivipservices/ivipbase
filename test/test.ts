import { MongoClient } from "mongodb";

async function main() {
	const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
	const client = new MongoClient(uri);

	try {
		await client.connect();
		const collection = client.db("root").collection("teste");

		const result = await collection.find().toArray();
		// const result2 = await collection.findOne()
		console.log(result);
		// console.log(result2)

		if (result) {
			// Acessar o campo "path"
			// const pathValue = result.path
			// Agora você pode ver o valor de "path"
			// console.log(pathValue)
		} else {
			console.log("Documento não encontrado");
		}
	} finally {
		await client.close();
	}
}

main().catch(console.error);
