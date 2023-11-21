import fs from "fs";

type Result = {
	path: string;
	content: {
		type: number;
		value: Record<string, unknown> | string | number;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};
interface ResultWithPath {
	path: string;
	content: {
		type: number;
		value: any;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
}

function transform(json: Record<string, unknown>, prefix: string = ""): Result[] {
	const results: Result[] = [];
	const nonObjectKeys: Record<string, unknown> = {};

	for (const key in json) {
		const currentPath = `${prefix}/${key.replace(/\*\*/g, "")}`;
		const currentValue = json[key];

		if (typeof currentValue === "object" && currentValue !== null) {
			// Se for objeto, chama recursivamente transform para processar objetos aninhados
			results.push(...transform(currentValue as Record<string, unknown>, currentPath));
		} else {
			// Se não for objeto, adiciona ao objeto de chaves não-objeto
			nonObjectKeys[key] = currentValue;
		}
	}

	// Adiciona um único resultado para chaves não-objeto
	if (Object.keys(nonObjectKeys).length > 0) {
		const nonObjectResult: Result = {
			path: `ivipcoin-db::movement_wallet${prefix}`,
			content: {
				type: 1,
				value: nonObjectKeys as any,
				revision: "lnt02q7v0007oohx37705737",
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		results.push(nonObjectResult);
	}

	return results;
}

const inputJson = {
	"000523147298669313": {
		balances: {
			BRL: {
				available: "2528.00700001",
				BRL: { available: "2528.00700001", symbol: "BRL", value: 494.23 },
				IVIP: { available: "1499269.00000000", symbol: "IVIP", value: 158.48 },
				symbol: "BRL",
				value: 494.23,
			},
			IVIP: { available: "1499269.00000000", symbol: "IVIP", value: 158.48 },
		},
	},
	"147006993684782200": {
		dataModificacao: 1678651931786,
		dateValidity: 1678669931823,
		balances: {},
		totalValue: 0,
		currencyType: "USD",
		history: {
			"1678652275580": {
				type: "deposit",
				wallet_type: "IVIPCOIN",
				payment_method: "pix",
				original_amount: 100,
				total_amount: 100.99,
				history_id: 1678652275580,
				id: 55661848873,
				date_created: "2023-03-12T16:17:56.428-04:00",
				date_last_updated: "2023-03-13T16:21:02.000-04:00",
				date_of_expiration: "2023-03-13T16:17:56.084-04:00",
				operation_type: "regular_payment",
				payment_type: "bank_transfer",
				status: "cancelled",
				status_detail: "expired",
				currency_id: "BRL",
				history: {
					"1678652275580": {
						type: "deposit",
						wallet_type: "IVIPCOIN",
						payment_method: "pix",
						original_amount: 100,
						total_amount: 100.99,
						history_id: 1678652275580,
						id: 55661848873,
						history: {
							"1678652275580": {
								type: "deposit",
								wallet_type: "IVIPCOIN",
								payment_method: "pix",
								original_amount: 100,
								total_amount: 100.99,
								history_id: 1678652275580,
								id: 55661848873,
								date_created: "2023-03-12T16:17:56.428-04:00",
								date_last_updated: "2023-03-13T16:21:02.000-04:00",
								date_of_expiration: "2023-03-13T16:17:56.084-04:00",
								operation_type: "regular_payment",
								payment_type: "bank_transfer",
								status: "cancelled",
								status_detail: "expired",
								currency_id: "BRL",
							},
						},
						date_created: "2023-03-12T16:17:56.428-04:00",
						date_last_updated: "2023-03-13T16:21:02.000-04:00",
						date_of_expiration: "2023-03-13T16:17:56.084-04:00",
						operation_type: "regular_payment",
						payment_type: "bank_transfer",
						status: "cancelled",
						status_detail: "expired",
						currency_id: "BRL",
					},
				},
			},
		},
	},
};

const result = transform(inputJson);
console.log(JSON.stringify(result, null, 2));

const dataJSONModel = JSON.stringify(result, null, 2);

function afterRestructureSaveIntoJSONFile(dataWithOutPathFromMongodb) {
	console.log(dataWithOutPathFromMongodb);

	const fileAddress: any = "./test/outputResultWithPathJSON.json";
	fs.writeFile(fileAddress, dataWithOutPathFromMongodb, (error) => {
		if (error) {
			console.error("Algum erro aconteceu", error);
		} else {
			console.log(fileAddress);
		}
	});

	return dataWithOutPathFromMongodb;
}

console.log(afterRestructureSaveIntoJSONFile(dataJSONModel));

function isObject(value: any): value is Record<string, unknown> {
	return typeof value === "object" && value !== null;
}
