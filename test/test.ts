import { MongoClient } from "mongodb";

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

		// const result = await collection.find().toArray();

		const KEY_THAT_MUST_BE_ARRAY = ["costs"];

		function restructJson(entries) {
			const result = {};

			entries.forEach((entry) => {
				const { path, content } = entry;
				const parts = path.split("/");
				let current = result;

				for (let i = 0; i < parts.length; i++) {
					const part = parts[i];

					if (i === parts.length - 1) {
						let key = part.replace(/__+/g, "_").replace(/^_+|_+$/g, "");
						// console.log({ key });
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

						// current[key].values.push(value);
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

		const entries = [
			{
				path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances/BRL",
				content: {
					type: 1,
					value: {
						available: "2528.00700001",
						symbol: "BRL",
						value: 494.23,
					},
					revision: "lnt02q7v0006oohx1hd4856x",
					revision_nr: 1,
					created: 1697467086139,
					modified: 1697467086139,
				},
			},
			{
				path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances/IVIP",
				content: {
					type: 1,
					value: {
						available: "1499269.00000000",
						symbol: "IVIP",
						value: 158.48,
					},
					revision: "lnt02q7v0007oohx37705737",
					revision_nr: 1,
					created: 1697467086139,
					modified: 1697467086139,
				},
			},
			{
				path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances",
				content: {
					type: 1,
					value: {},
					revision: "lnt02q7v0005oohx3xm7c536",
					revision_nr: 1,
					created: 1697467086139,
					modified: 1697467086139,
				},
			},
		];

		const resultPathx = restructJson(entries);
		console.log(JSON.stringify(resultPathx, null, 2));

		// if (result) {
		// } else {
		// 	console.log("Documento não encontrado");
		// }
	} finally {
		await client.close();
	}
}

main().catch(console.error);
