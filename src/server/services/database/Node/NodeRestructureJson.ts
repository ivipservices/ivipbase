import { MongoClient } from "mongodb";
import fs from "fs";

// Class encapsulating the data restructuring functionality
class NoderestructureJson {
	private readonly uri: string;
	private readonly client: MongoClient;

	constructor(uri: string) {
		this.uri = uri;
		this.client = new MongoClient(uri);
	}

	// Establish a connection to the MongoDB database
	private async connectToDatabase() {
		await this.client.connect();
	}

	// Close the connection to the MongoDB database
	private async closeDatabaseConnection() {
		await this.client.close();
	}

	// Restructure JSON data based on specified logic
	private restructureJson(entries) {
		const result = {};
		const KEY_THAT_MUST_BE_ARRAY = ["costs"];
		entries.forEach((entry) => {
			const { path, content } = entry;
			const parts = path.split("/");
			let current = result;

			for (let i = 0; i < parts.length; i++) {
				const part = parts[i];

				if (i === parts.length - 1) {
					let key = part.replace(/__+/g, "_").replace(/^_+|_+$/g, "");
					const { value } = content;

					if (!current[key]) {
						key = key.split("[")[0];

						// Check if the key must be an array
						if (KEY_THAT_MUST_BE_ARRAY.includes(key)) {
							current[key] = [];

							if (Object.keys(value).length) {
								current[key].push(value);
							}
						} else {
							current[key] = value;
						}
					}
				} else {
					if (!current[part]) {
						current[part] = {};
					}

					current = current[part];
				}
			}
		});

		return result;
	}

	// Fetch data from MongoDB collection
	private async fetchDataFromMongoDB() {
		const collection = this.client.db("root").collection("teste");
		const limit = 50;

		console.log(new Date().getSeconds(), "antes da busca");
		const resultData = await collection.find().toArray();
		const afterLimit = resultData.slice(0, limit);

		return afterLimit;
	}

	// Convert JSON data to string and save it to a file
	private convertToJsonAndSaveToFile(dataWithOutPathFromMongodb) {
		console.log(dataWithOutPathFromMongodb);

		const fileAddress: any = "./test/outputRestructuredJSON.json";
		fs.writeFile(fileAddress, dataWithOutPathFromMongodb, (error) => {
			if (error) {
				console.error("Algum erro aconteceu", error);
			} else {
				console.log(fileAddress);
			}
		});

		return dataWithOutPathFromMongodb;
	}

	// Main method orchestrating the data restructuring process
	public async main() {
		try {
			await this.connectToDatabase();

			const entries = await this.fetchDataFromMongoDB();
			const dataAfterToBeRestructured = this.restructureJson(entries);
			const dataFromMongoConvertedToJSON = JSON.stringify(dataAfterToBeRestructured, null, 2);

			console.log(this.convertToJsonAndSaveToFile(dataFromMongoConvertedToJSON));

			console.log(new Date().getSeconds(), "final da busca");
		} finally {
			await this.closeDatabaseConnection();
		}
	}
}

// Usage
const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
const dataRestructure = new NoderestructureJson(uri);
dataRestructure.main().catch(console.error);
