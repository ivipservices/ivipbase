import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

type NodeValueType = keyof typeof nodeValueTypes;

type Result = {
	path: string;
	content: {
		type: NodeValueType;
		value: Record<string, unknown> | string | number;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};

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

function generateShortUUID(): string {
	const fullUUID = randomUUID();
	const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
	return shortUUID;
}

function getType(value: unknown): NodeValueType {
	if (Array.isArray(value)) {
		return "ARRAY";
	} else if (value && typeof value === "object") {
		return "OBJECT";
	} else if (typeof value === "number") {
		return "NUMBER";
	} else if (typeof value === "boolean") {
		return "BOOLEAN";
	} else if (typeof value === "string") {
		return "STRING";
	} else if (typeof value === "bigint") {
		return "BIGINT";
	} else if (typeof value === "object" && (value as any).type === 6) {
		return "DATETIME";
	} else {
		return "EMPTY";
	}
}

//
const LITERAL = ["qr_code_base64", "qr_code", "ticket_url", "description", "external_resource_url"];
function transform(json: Record<string, unknown>, prefix: string = ""): Result[] {
	const results: Result[] = [];
	const nonObjectKeys: Record<string, unknown> = {};
	const arrayResults: Result[] = [];

	for (const key in json) {
		const currentPath = `${prefix.replace(/^\//, "")}/${key.replace(/\*\*/g, "")}`;
		const currentValue = json[key];
		const valueType = getType(currentValue);

		if (typeof currentValue === "string" && currentValue.length >= 50) {
			arrayResults.push({
				path: currentPath,
				content: {
					type: valueType,
					value: currentValue,
					revision: generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			});
		}

		if (Array.isArray(currentValue) && currentValue.length > 0 && currentValue.length <= 49) {
			// Se for um array com valores, itera por cada elemento
			for (let i = 0; i < currentValue.length; i++) {
				results.push(...transform(currentValue[i] as Record<string, unknown>, `${currentPath}[${i}]`));
			}
			// Adiciona um resultado para o array vazio
			arrayResults.push({
				path: currentPath,
				content: {
					type: "ARRAY",
					value: {},
					revision: generateShortUUID(),
					revision_nr: 1,
					created: Date.now(),
					modified: Date.now(),
				},
			});
		} else if (valueType === "OBJECT" && LITERAL.includes(key)) {
			console.log(currentValue);
			results.push(...transform(currentValue as unknown as Record<string, unknown>, currentPath));
		} else {
			nonObjectKeys[key] = currentValue;
		}
	}

	// Adiciona um único resultado para chaves não objeto

	if (Object.keys(nonObjectKeys).length > 0) {
		const nonObjectResult: Result = {
			path: `${prefix.replace(/^\//, "")}`,
			content: {
				type: getType(nonObjectKeys),
				value: nonObjectKeys as any,
				revision: generateShortUUID(),
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		if (nonObjectResult.path) {
			results.push(nonObjectResult);
		}
	}

	// Se não há chaves não objeto, adiciona um resultado com objeto vazio
	if (Object.keys(nonObjectKeys).length === 0) {
		const nonObjectResult: Result = {
			path: `${prefix.replace(/^\//, "")}`,
			content: {
				type: getType({}),
				value: {} as any,
				revision: generateShortUUID(),
				revision_nr: 1,
				created: Date.now(),
				modified: Date.now(),
			},
		};
		if (nonObjectResult.path) {
			results.push(nonObjectResult);
		}
	}

	// Adiciona resultados para arrays
	results.push(...arrayResults);

	return results;
}

function readPath() {
	const fileName = "__movement_wallet__.json";

	const filePath = path.join(__dirname, fileName);

	fs.readFile(filePath, "utf8", (err, data) => {
		if (err) {
			console.error("Error reading the file:", err);
			return;
		}

		try {
			var dataToArray = JSON.parse(data);

			const result = transform(dataToArray);

			const dataJSONModel = JSON.stringify(result, null, 2);

			function afterRestructureSaveIntoJSONFile(dataWithOutPathFromMongodb) {
				console.log(new Date().getSeconds(), "started");

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
			afterRestructureSaveIntoJSONFile(dataJSONModel);
		} catch (parseError) {
			console.error("Error parsing JSON:", parseError);
		}
	});
	console.log(new Date().getSeconds(), "end");
}
readPath();
