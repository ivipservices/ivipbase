import { MongoClient, Collection, Db } from "mongodb";

import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

type NodeValueType = keyof typeof nodeValueTypes;
import Node, { nodeValueTypes } from "./../src/server/services/database/Node/index";
import { PathInfo } from "ivipbase-core";

(async () => {
	const client: MongoClient = await MongoClient.connect("mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048");
	const db: Db = client.db("root");
	const collection: Collection = db.collection("ivipcoin-db");

	// console.log(new Date().toLocaleString("pt-BR"));

	const path: string = "ivipcoin-db::__movement_wallet__/000523147298669313/history/*";

	const data = new Node([], {
		async dataSynchronization(path, type, nodes) {
			// console.log(path);
			if (type === "get") {
				const result = await (collection
					.find({
						path: {
							$regex: path,
						},
					})
					.toArray() as Promise<any[]>);

				return result;
			}

			return [];
		},
	});

	await data.synchronize(path, true);

	type Result = {
		path: string;
		content: {
			type: any;
			value: Record<string, unknown> | string | number;
			revision: string;
			revision_nr: number;
			created: number;
			modified: number;
		};
	};

	data.setNode("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", "DDDDD");

	const o_path = "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id";

	function set(path: string, value: any, options: { assert_revision?: string } = {}): Result[] {
		const results: Result[] = [];

		if (path.trim() === "") {
			throw new Error(`Invalid path node`);
		}

		const pathInfo = PathInfo.get(path);
		const theKey: any = pathInfo.key;

		if (Array.isArray(value) && value.length > 0) {
			// If 'value' is an array, process each object in the array
			value.forEach((obj, i) => {
				const currentPath = `${path}[${i}]`; // Include the array index in the path

				const processedValue = {
					[theKey]: obj,
				};

				const arrayResult: Result = {
					path: currentPath,
					content: {
						type: 2, // Assuming it's still type 2 for non-array items
						value: processedValue,
						revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};

				results.push(arrayResult);
			});
			const arrayResult: Result = {
				path: pathInfo.path,
				content: {
					type: 2, // Assuming it's still type 2 for non-array items
					value: {},
					revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(arrayResult);
		} else {
			// If 'value' is not an array, create a single object
			const processedValue = {
				[theKey]: value,
			};

			if (typeof value === "string") {
				const processedValue = {
					[theKey]: value,
				};
				const nonObjectResult: Result = {
					path: pathInfo.parentPath as string,
					content: {
						type: 2,
						value: processedValue,
						revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				results.push(nonObjectResult);
			}

			if (typeof value === "string" && value.length >= 50) {
				results.push({
					path: pathInfo.parentPath as string,
					content: {
						type: 2,
						value: processedValue,
						revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				});
				// console.log(currentValue, "string");
			}
			// Initialize the object if it doesn't exist

			// const resultadoFiltrado = Object.entries(value)
			// 	.filter(([key, value]) => typeof value === "string"  ||typeof value !== "number"  && value.length < 50)
			// 	.reduce((acc, [key, value]) => {
			// 		acc[key] = value;
			// 		return acc;
			// 	}, {});

			if (typeof value === "object") {
				const otherObject = Object.entries(value as any)
					.filter(([key, value]) => typeof value !== "string" || value.length < 49)
					.reduce((acc, [key, value]) => {
						acc[key] = value;
						return acc;
					}, {} as Record<string, unknown>);
				// Encontrar chaves com valores maiores que 50
				const valueArray = Object.entries(value);
				// console.info(valueArray);
				valueArray.forEach(([key, valueOfObj]) => {
					// console.log(`Key: ${key}, Value: ${value}`);
					const result = `${key}: ${valueOfObj}`;

					if (result.length >= 50) {
						console.log(key);

						const nonObjectResult: Result = {
							path: `${pathInfo.path}/${key}` as string,
							content: {
								type: 2,
								value: valueOfObj as string,
								revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
								revision_nr: 1,
								created: Date.now(),
								modified: Date.now(),
							},
						};
						results.push(nonObjectResult);
					} else {
						const nonObjectResult: Result = {
							path: pathInfo.path as string,
							content: {
								type: 2,
								value: otherObject as any,
								revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
								revision_nr: 1,
								created: Date.now(),
								modified: Date.now(),
							},
						};

						// Return the result (if necessary)
						results.push(nonObjectResult);
					}
				});
			}
		}
		// console.log(results);
		return results;
	}

	// Example usage:
	const rsul = set("/example/curenty_value_pedro_rosada_ivipi_tiago", [{ prop1: "value1" }, { prop2: "value2" }]);
	const x = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/costs", [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }]);
	console.log("-----------------------------------------------------------------------------");

	console.log(JSON.stringify(x, null, 2));
	console.log("-----------------------------------------------------------------------------");

	console.log(JSON.stringify(rsul, null, 2));

	// Exemplo de uso:

	// Exemplo de uso:
	console.log("-----------------------------------------------------------------------------");

	// Exemplo de uso:

	const xx = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", "DDDDD");
	console.log(JSON.stringify(xx, null, 2));
	console.log("-----------------------------------------------------------------------------");

	const t = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", {
		installments: 1,
		payment_method_reference_id: "10194042832",
		acquirer_reference: "Deposito de um valor R$ 60,00 para a carteira iVip 0005.2314.7298.6693-13",
		verification_code: "10194042832",
		net_received_amount: 0,
		total_paid_amount: 606.49,
		overpaid_amount: 0,
		installment_amount: "Deposito de um valor R$ 60,00 para a carteira iVip 0005.2314.7298.6693-13",
		financial_institution: "bradesco",
	});
	console.log(JSON.stringify(t, null, 2));

	console.log("-----------------------------------------------------------------------------");
})();

type Result = {
	path: string;
	content: {
		type: any;
		value: Record<string, unknown> | string | number;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};
