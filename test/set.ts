import { MongoClient, Collection, Db } from "mongodb";

import fs from "fs";
// import path from "path";
import { randomUUID } from "crypto";

function generateShortUUID(): string {
	const fullUUID = randomUUID();
	const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
	return shortUUID;
}
// type NodeValueType = keyof typeof nodeValueTypes;
// import Node, { nodeValueTypes } from "./../src/server/services/database/Node/index";
import { PathInfo } from "ivipbase-core";

(async () => {
	const client: MongoClient = await MongoClient.connect("mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048");
	const db: Db = client.db("root");
	const collection: Collection = db.collection("ivipcoin-db");

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

	function set(path: string, value: any, options: { assert_revision?: string } = {}): Result[] {
		const results: Result[] = [];

		// const pathParts = path.split("/");
		// let currentPath = "";

		// PathInfo.get(path).keys.forEach((part, i) => {
		// 	currentPath += (i > 0 ? "/" : "") + part;

		// 	const arrayResult = {
		// 		path: currentPath.substring(1),
		// 		content: {
		// 			type: 2,
		// 			value: {},
		// 			revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
		// 			revision_nr: 1,
		// 			created: Date.now(),
		// 			modified: Date.now(),
		// 		},
		// 	};
		// 	if (arrayResult.path) {
		// 		results.push(arrayResult);
		// 	}
		// });

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
		}
		if (typeof value === "object" && !Array.isArray(value)) {
			// Encontrar chaves com valores maiores que 50
			const valueArray = Object.entries(value);
			valueArray.forEach(([key, valueOfObj]) => {
				const result = `${key}: ${valueOfObj}`;

				if (result.length >= 50) {
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
				}
			});

			const otherObject = Object.entries(value as any)
				.filter(([key, value]) => typeof value !== "string" || value.length < 49)
				.reduce((acc, [key, value]) => {
					acc[key] = value;
					return acc;
				}, {} as Record<string, unknown>);
			const nonObjectResult: Result = {
				path: (pathInfo.path + "DEUS") as string,
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
		return results;
	}

	//Example usage:
	// const rsul = set("/example/curenty_value_pedro_rosada_ivipi_tiago", [{ prop1: "value1" }, { prop2: "value2" }]);
	// const x = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/costs", [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }]);
	// console.log("-----------------------------------------------------------------------------");

	// console.log(JSON.stringify(x, null, 2));
	// console.log("-----------------------------------------------------------------------------");

	// console.log(JSON.stringify(rsul, null, 2));

	// //Exemplo de uso:

	// //Exemplo de uso:
	// console.log("-----------------------------------------------------------------------------");

	//Exemplo de uso:

	// const xx = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", "DDDDD");
	// console.log(JSON.stringify(xx, null, 2));
	// console.log("-----------------------------------------------------------------------------");

	// const t = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id", {
	// 	installments: 1,
	// 	payment_method_reference_id: "10194042832",
	// 	acquirer_reference: "Deposito de um valor R$ 60,00 para a carteira iVip 0005.2314.7298.6693-13",
	// 	verification_code: "10194042832",
	// 	net_received_amount: 0,
	// 	total_paid_amount: 606.49,
	// 	overpaid_amount: 0,
	// 	installment_amount: "Deposito de um valor R$ 60,00 para a carteira iVip 0005.2314.7298.6693-13",
	// 	financial_institution: "bradesco",
	// });
	// console.log(JSON.stringify(t, null, 2));

	// console.log("-----------------------------------------------------------------------------");
})();

// OLH, EU TENHO ESSE PATH
// "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id"

// "ivipcoin-db::__movement_wallet__"

// "ivipcoin-db::__movement_wallet__/000523147298669313"

// "ivipcoin-db::__movement_wallet__/000523147298669313/history"
// "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788"

// type Result = {
// 	path: string;
// 	content: {
// 		type: any;
// 		value: Record<string, unknown> | string | number;
// 		revision: string;
// 		revision_nr: number;
// 		created: number;
// 		modified: number;
// 	};
// };

// function processObject(obj, pathInfo, results, options) {
// 	const currentPath = pathInfo.path;
// 	const { assert_revision = "lnt02q7v0007oohx37705737" } = options;
// 	const MAX_KEY_LENGTH = 50;

// 	if (typeof obj !== "object" || Array.isArray(obj)) {
// 		// Caso seja um array, você pode adicionar lógica específica aqui, se necessário.
// 		return;
// 	}

// 	const nonObjectKeys = {};
// 	let otherObject;
// 	let maior;

// 	for (const [key, value] of Object.entries(obj)) {
// 		const childPath = `${currentPath}/${key}`;

// 		if (Array.isArray(value)) {
// 			// Se o valor for um array, processe cada elemento do array
// 			value.forEach((element, index) => {
// 				const arrayElementPath = `${childPath}[${index}]`;
// 				processObject(element, { path: arrayElementPath }, results, options);
// 			});
// 			const resultContent = {
// 				path: childPath, // Use o caminho específico para valores longos
// 				content: {
// 					type: 2,
// 					value: {},
// 					revision: assert_revision,
// 					revision_nr: 1,
// 					created: Date.now(),
// 					modified: Date.now(),
// 				},
// 			};
// 			results.push(resultContent);
// 		} else if (typeof value === "object") {
// 			// Se o valor é um objeto, chame a função novamente recursivamente
// 			processObject(value, { path: childPath }, results, options);
// 		} else {
// 			if (String(value).length >= MAX_KEY_LENGTH) {
// 				// Se o valor (considerando como string) tem mais de 50 caracteres, adicione um resultado para ele
// 				const resultContent = {
// 					path: childPath, // Use o caminho específico para valores longos
// 					content: {
// 						type: 2,
// 						value: value,
// 						revision: assert_revision,
// 						revision_nr: 1,
// 						created: Date.now(),
// 						modified: Date.now(),
// 					},
// 				};
// 				results.push(resultContent);
// 			} else {
// 				nonObjectKeys[key] = value;
// 				if (String(value).length >= MAX_KEY_LENGTH) {
// 					maior = Object.entries(nonObjectKeys)
// 						.filter(([k, v]) => typeof v !== "string" || String(v).length >= MAX_KEY_LENGTH)
// 						.reduce((acc, [k, v]) => {
// 							acc[k] = v;
// 							return acc;
// 						}, {});
// 				}
// 			}
// 		}
// 	}

// 	if (Object.keys(nonObjectKeys).length > 0) {
// 		const resultContent = {
// 			path: currentPath,
// 			content: {
// 				type: 1,
// 				value: otherObject || nonObjectKeys,
// 				revision: assert_revision,
// 				revision_nr: 1,
// 				created: Date.now(),
// 				modified: Date.now(),
// 			},
// 		};
// 		results.push(resultContent);
// 	}

// 	if (maior) {
// 		const resultContent = {
// 			path: `${currentPath}/maior`, // Caminho específico para os objetos maiores
// 			content: {
// 				type: 1,
// 				value: maior,
// 				revision: assert_revision,
// 				revision_nr: 1,
// 				created: Date.now(),
// 				modified: Date.now(),
// 			},
// 		};
// 		results.push(resultContent);
// 	}
// }

// function set(path: string, value: any, options: { assert_revision?: string } = {}): Result[] {
// 	const results: Result[] = [];

// 	if (path.trim() === "") {
// 		throw new Error(`Invalid path node`);
// 	}

// 	const pathInfo = PathInfo.get(path);

// 	if (typeof value === "object" && !Array.isArray(value)) {
// 		processObject(value, { path: pathInfo.path }, results, options);
// 	}
// 	let currentPath = "";

// 	PathInfo.get(path).keys.forEach((part, i) => {
// 		currentPath += (i > 0 ? "/" : "") + part;

// 		if (!Array.isArray(value)) {
// 			const arrayResult = {
// 				path: currentPath.substring(1),
// 				content: {
// 					type: 2,
// 					value: {},
// 					revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
// 					revision_nr: 1,
// 					created: Date.now(),
// 					modified: Date.now(),
// 				},
// 			};
// 			if (arrayResult.path) {
// 				results.push(arrayResult);
// 			}
// 		}
// 	});

// 	const theKey: any = pathInfo.key;

// 	if (Array.isArray(value) && value.length > 0) {
// 		// If 'value' is an array, process each object in the array
// 		value.forEach((obj, i) => {
// 			const currentPath = `${path}[${i}]`; // Include the array index in the path

// 			const processedValue = {
// 				[theKey]: obj,
// 			};

// 			const arrayResult: Result = {
// 				path: currentPath,
// 				content: {
// 					type: 2, // Assuming it's still type 2 for non-array items
// 					value: processedValue,
// 					revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
// 					revision_nr: 1,
// 					created: Date.now(),
// 					modified: Date.now(),
// 				},
// 			};

// 			results.push(arrayResult);
// 		});
// 		const arrayResult: Result = {
// 			path: pathInfo.path,
// 			content: {
// 				type: 2, // Assuming it's still type 2 for non-array items
// 				value: {},
// 				revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
// 				revision_nr: 1,
// 				created: Date.now(),
// 				modified: Date.now(),
// 			},
// 		};
// 		results.push(arrayResult);
// 	} else {
// 		// If 'value' is not an array, create a single object
// 		const processedValue = {
// 			[theKey]: value,
// 		};

// 		if (typeof value === "string") {
// 			const processedValue = {
// 				[theKey]: value,
// 			};
// 			const nonObjectResult: Result = {
// 				path: pathInfo.parentPath as string,
// 				content: {
// 					type: 2,
// 					value: processedValue,
// 					revision: options.assert_revision || "lnt02q7x000eoohx91rb246i",
// 					revision_nr: 1,
// 					created: Date.now(),
// 					modified: Date.now(),
// 				},
// 			};
// 			results.push(nonObjectResult);
// 		}
// 	}
// 	return results;
// }

const nodeValueTypes = {
	EMPTY: 0,
	OBJECT: 1,
	ARRAY: 2,
	NUMBER: 3,
	BOOLEAN: 4,
	STRING: 5,
	DATETIME: 6,
	BIGINT: 7,
	BINARY: 8,
	REFERENCE: 9,
} as const;

type Result = {
	path: string;
	content: {
		type: (typeof nodeValueTypes)[keyof typeof nodeValueTypes];
		value: Record<string, unknown> | string | number;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};

function getType(value: unknown): number {
	if (Array.isArray(value)) {
		return nodeValueTypes.ARRAY;
	} else if (value && typeof value === "object") {
		return nodeValueTypes.OBJECT;
	} else if (typeof value === "number") {
		return nodeValueTypes.NUMBER;
	} else if (typeof value === "boolean") {
		return nodeValueTypes.BOOLEAN;
	} else if (typeof value === "string") {
		return nodeValueTypes.STRING;
	} else if (typeof value === "bigint") {
		return nodeValueTypes.BIGINT;
	} else if (typeof value === "object" && (value as any).type === 6) {
		return nodeValueTypes.DATETIME;
	} else {
		return nodeValueTypes.EMPTY;
	}
}

function processObject(obj, pathInfo, results, options) {
	const currentPath = pathInfo.path;
	const { assert_revision = "lnt02q7v0007oohx37705737" } = options;
	const MAX_KEY_LENGTH = 50;

	if (typeof obj !== "object" || Array.isArray(obj)) {
		return;
	}

	const nonObjectKeys = {};
	let otherObject;
	let maior;

	for (const [key, value] of Object.entries(obj)) {
		const childPath = `${currentPath}/${key}`;

		if (Array.isArray(value)) {
			value.forEach((element, index) => {
				const arrayElementPath = `${childPath}[${index}]`;
				processObject(element, { path: arrayElementPath }, results, options);
			});
			const resultContent = {
				path: childPath,
				content: {
					type: nodeValueTypes.ARRAY,
					value: {},
					revision: generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(resultContent);
		} else if (typeof value === "object") {
			processObject(value, { path: childPath }, results, options);
		} else {
			const valueType = getType(value);
			if (String(value).length >= MAX_KEY_LENGTH) {
				const resultContent = {
					path: childPath,
					content: {
						type: valueType,
						value: value,
						revision: generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};
				results.push(resultContent);
			} else {
				nonObjectKeys[key] = value;
				if (String(value).length >= MAX_KEY_LENGTH) {
					maior = Object.entries(nonObjectKeys)
						.filter(([k, v]) => typeof v !== "string" || String(v).length >= MAX_KEY_LENGTH)
						.reduce((acc, [k, v]) => {
							acc[k] = v;
							return acc;
						}, {});
				}
			}
		}
	}

	if (Object.keys(nonObjectKeys).length > 0) {
		const resultContent = {
			path: currentPath,
			content: {
				type: nodeValueTypes.OBJECT,
				value: otherObject || nonObjectKeys,
				revision: generateShortUUID(),
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		results.push(resultContent);
	}

	if (maior) {
		const resultContent = {
			path: `${currentPath}/maior`,
			content: {
				type: nodeValueTypes.OBJECT,
				value: maior,
				revision: generateShortUUID(),
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		results.push(resultContent);
	}
}

function set(path: string, value: any, options: { assert_revision?: string } = {}): Result[] {
	const results: Result[] = [];

	if (path.trim() === "") {
		throw new Error(`Invalid path node`);
	}

	const pathInfo = PathInfo.get(path);

	if (typeof value === "object" && !Array.isArray(value)) {
		processObject(value, { path: pathInfo.path }, results, options);
	}
	let currentPath = "";

	PathInfo.get(path).keys.forEach((part, i) => {
		currentPath += (i > 0 ? "/" : "") + part;

		if (!Array.isArray(value)) {
			const arrayResult = {
				path: currentPath.substring(1),
				content: {
					// type: nodeValueTypes.ARRAY,
					type: getType(value),
					value: {},
					revision: generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			if (arrayResult.path) {
				results.push(arrayResult as any);
			}
		}
	});

	const theKey: any = pathInfo.key;

	if (Array.isArray(value) && value.length > 0) {
		value.forEach((obj, i) => {
			const currentPath = `${path}[${i}]`;
			const processedValue = {
				[theKey]: obj,
			};
			const arrayResult: Result = {
				path: currentPath,
				content: {
					type: nodeValueTypes.ARRAY,
					value: processedValue,
					revision: generateShortUUID(),
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
				type: nodeValueTypes.ARRAY,
				value: {},
				revision: generateShortUUID(),
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		results.push(arrayResult);
	} else {
		const valueType = getType(value);
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
					type: valueType as any,
					value: processedValue,
					revision: generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			};
			results.push(nonObjectResult);
		}
	}
	return results;
}

const options = { assert_revision: "algum_valor" };

// Exemplo de uso
const path = "ivipcoin-db::movement_wallet/000523147298669313/history/1677138262468";
const value = {
	type: "deposit",
	wallet_type:
		"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
	payment_method: "bolbradesco",
	original_amount: 603,
	total_amount: [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }],
	id: 1311772470,
	operation_type: "regular_payment",
	payment_type: "ticket",
	status: {
		payment_method:
			"Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres.....",
		original_amount: 603,
		total_amount: 606.49,
		id: [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }],
		operation_type: "regular_payment",
		payment_type: "ticket",
		currency_id: "BRL",
		history_id: "1677138262468",
		striue50:
			"Valor da string maior Valor Valor da string maior Valor da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres... da string maior que 50 caracteres Valor da que 50 caracteres Valor da string maior que 50 caracteres...",
	},
	status_detail: "pending_waiting_payment",
	currency_id: "BRL",
	history_id: "1677138262468",
};

// const rsul = set("/example/curenty_value_pedro_rosada_ivipi_tiago", [{ prop1: "value1" }, { prop2: "value2" }], options);
// const x = set("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/costs", [{ title: "Taxa de serviço", label: "Taxa de R$ 3,49", amount: 3.49 }], options);
// console.log(JSON.stringify(rsul, null, 2));

// console.log("-----------------------------------------------------------------------------");

// console.log(JSON.stringify(x, null, 2));
// console.log("-----------------------------------------------------------------------------");

const results = set(path, value, options);

console.log(JSON.stringify(results, null, 2));
