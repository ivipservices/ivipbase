import { MongoClient } from "mongodb";
import fs from "fs";

interface Balance {
	available: string;
	symbol: string;
	value: number;
}

interface BalanceInfo {
	[symbol: string]: Balance;
}

interface OriginalBalance {
	path: string;
	content: {
		value: Balance;
	};
}

interface RestructuredResult {
	balances: BalanceInfo;
}
async function main() {
	const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
	const client = new MongoClient(uri);

	try {
		await client.connect();
		const collection = client.db("root").collection("teste");
		const limit = 50;

		console.log(new Date().getSeconds(), "antes da busca");
		const resultData = await collection.find().toArray();
		const afterLimit = resultData.slice(0, limit);

		console.log(new Date().getSeconds(), "depois da busca");

		const KEY_THAT_MUST_BE_ARRAY = ["costs"];

		function restructureJson(entries) {
			const result = {};

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

		const entries = afterLimit;

		const dataAfterToBeRestructured = restructureJson(entries);

		const dataFromMongoConvertedToJSON = JSON.stringify(dataAfterToBeRestructured, null, 2);

		function afterRestructureSaveIntoJSONFile(dataWithOutPathFromMongodb) {
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

		console.log(afterRestructureSaveIntoJSONFile(dataFromMongoConvertedToJSON));

		console.log(new Date().getSeconds(), "final da busca");
	} finally {
		await client.close();
	}
}

main().catch(console.error);
