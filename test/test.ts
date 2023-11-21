import { MongoClient } from "mongodb";
import fs from "fs";
import { after } from "node:test";

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
		// const entries = [
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances/BRL",
		// 		content: {
		// 			type: 1,
		// 			value: {
		// 				available: "2528.00700001",
		// 				symbol: "BRL",
		// 				value: 494.23,
		// 			},
		// 			revision: "lnt02q7v0006oohx1hd4856x",
		// 			revision_nr: 1,
		// 			created: 1697467086139,
		// 			modified: 1697467086139,
		// 		},
		// 	},
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/details/costs[0]",
		// 		content: {
		// 			type: 1,
		// 			value: { title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 },
		// 			revision: "lnt02q7y000moohxbtckd7dc",
		// 			revision_nr: 1,
		// 			created: 1697467086142,
		// 			modified: 1697467086142,
		// 		},
		// 	},
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances/IVIP",
		// 		content: {
		// 			type: 1,
		// 			value: {
		// 				available: "1499269.00000000",
		// 				symbol: "IVIP",
		// 				value: 158.48,
		// 			},
		// 			revision: "lnt02q7v0007oohx37705737",
		// 			revision_nr: 1,
		// 			created: 1697467086139,
		// 			modified: 1697467086139,
		// 		},
		// 	},
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/balances",
		// 		content: {
		// 			type: 1,
		// 			value: {},
		// 			revision: "lnt02q7v0005oohx3xm7c536",
		// 			revision_nr: 1,
		// 			created: 1697467086139,
		// 			modified: 1697467086139,
		// 		},
		// 	},
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138262468/details",
		// 		content: {
		// 			type: 1,
		// 			value: {
		// 				installments: 1,
		// 				payment_method_reference_id: "10194042832",
		// 				acquirer_reference: "",
		// 				verification_code: "10194042832",
		// 				net_received_amount: 0,
		// 				total_paid_amount: 606.49,
		// 				overpaid_amount: 0,
		// 				installment_amount: 0,
		// 				financial_institution: "bradesco",
		// 			},
		// 			revision: "lnt02q7w000boohx9oufgquj",
		// 			revision_nr: 1,
		// 			created: 1697467086141,
		// 			modified: 1697467086141,
		// 		},
		// 	},
		// 	{
		// 		path: "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/description",
		// 		content: {
		// 			type: 5,
		// 			value: "Deposito de um valor R$ 592,00 para a carteira iVip 0005.2314.7298.6693-13Tarifas: - Taxa de serviço (Taxa de R$ 3,49):  + R$ 3,49",
		// 			revision: "lnt02q7x000hoohx4hktecqo",
		// 			revision_nr: 1,
		// 			created: 1697467086141,
		// 			modified: 1697467086141,
		// 		},
		// 	},
		// ];

		const resultPathx = restructJson(entries);

		const jsonPath = JSON.stringify(resultPathx, null, 2);

		function createJson(resultPathsParams) {
			console.log(resultPathsParams);
			const fileAddress: any = "./test/file.json";
			fs.writeFile(fileAddress, resultPathsParams, (error) => {
				if (error) {
					console.error("Algum erro aconteceu", error);
				} else {
					console.log(fileAddress);
				}
			});

			return resultPathsParams;
		}

		console.log(createJson(jsonPath));

		// console.log(JSON.stringify(resultPathx, null, 2));
		console.log(new Date().getSeconds(), "final da busca");

		// if (result) {
		// } else {
		// 	console.log("Documento não encontrado");
		// }
	} finally {
		await client.close();
	}
}

main().catch(console.error);
