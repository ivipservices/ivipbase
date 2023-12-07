import * as fs from "fs";
import * as path from "path";

import { randomUUID } from "crypto";

type NodeValueType = keyof typeof nodeValueTypes;

type Result = {
	path: string;
	content: {
		type: number;
		value: Record<string, unknown> | string | number | any;
		revision: string;
		revision_nr: number;
		created: number;
		modified: number;
	};
};

const FILE_ADDRESS_INPUT = "../../../../../test/__movement_wallet__.json";

const FILE_ADDRESS_OUTPUT = "./test/outputResultWithPathJSON.json";
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

class ReadFiles {
	private fileAddress: string;
	private outputResultPath: string;
	private fileAddressParam: string;

	constructor(fileAddress?: string, outputResultPath?: string, fileAddressParam?: string) {
		this.fileAddress = fileAddress || "./test/outputResultWithPathJSON.json";
		this.outputResultPath = outputResultPath || FILE_ADDRESS_INPUT;
		this.fileAddressParam = fileAddressParam || FILE_ADDRESS_INPUT;
	}

	public readPath() {
		const filePath = path.join(__dirname, this.fileAddressParam);

		fs.readFile(filePath, "utf8", (err, data) => {
			if (err) {
				console.error("Error reading the file:", err);
				return;
			}

			console.log(filePath);

			try {
				const dataToArray = JSON.parse(data);
				const nodeJsonTransformer = new NodeJsonTransformer();

				const result = nodeJsonTransformer.transform(dataToArray);

				const dataJSONModel = JSON.stringify(result, null, 2);

				const afterRestructureSaveIntoJSONFile = (dataWithOutPathFromMongodb: any) => {
					console.log(new Date().getSeconds(), "started");

					fs.writeFile(this.fileAddress, dataWithOutPathFromMongodb, (error) => {
						if (error) {
							console.error("Algum erro aconteceu", error);
						} else {
							console.log(this.fileAddress);
						}
					});

					return dataWithOutPathFromMongodb;
				};

				afterRestructureSaveIntoJSONFile(dataJSONModel);
			} catch (parseError) {
				console.error("Error parsing JSON:", parseError);
			}
		});
		console.log(new Date().getSeconds(), "end");
	}
}

class NodeJsonTransformer {
	private generateShortUUID(): string {
		const fullUUID = randomUUID();
		const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
		return shortUUID;
	}

	public getType(value: unknown): number {
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

	public transform(json: Record<string, unknown>, prefix: string = ""): Result[] {
		const results: Result[] = [];
		const nonObjectKeys: Record<string, unknown> = {};
		const arrayResults: Result[] = [];
		let otherObject;

		for (const key in json) {
			const currentPath = `${prefix.replace(/^\//, "")}/${key.replace(/\*\*/g, "")}`;
			const currentValue = json[key];
			const valueType = this.getType(currentValue);

			if (typeof currentValue === "string" && currentValue.length >= 50) {
				arrayResults.push({
					path: currentPath,
					content: {
						type: valueType,
						value: currentValue,
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				});
			}

			if (Array.isArray(currentValue) && currentValue.length > 0 && currentValue.length <= 49) {
				// Se for um array com valores, itera por cada elemento
				for (let i = 0; i < currentValue.length; i++) {
					results.push(...this.transform(currentValue[i] as Record<string, unknown>, `${currentPath}[${i}]`));
				}
				// Adiciona um resultado para o array vazio
				arrayResults.push({
					path: currentPath,
					content: {
						type: nodeValueTypes.ARRAY,
						value: {},
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				});
			} else if (valueType === nodeValueTypes.OBJECT) {
				results.push(...this.transform(currentValue as unknown as Record<string, unknown>, currentPath));
			} else {
				nonObjectKeys[key] = currentValue;
				let ob = nonObjectKeys;
				otherObject = Object.entries(ob)
					.filter(([key, value]) => typeof value !== "string" || value.length < 49)
					.reduce((acc, [key, value]) => {
						acc[key] = value;
						return acc;
					}, {} as Record<string, unknown>);
			}
		}

		// Adiciona um único resultado para chaves não objeto

		if (Object.keys(nonObjectKeys).length > 0) {
			if (typeof otherObject === "object" && otherObject !== null) {
				const nonObjectResult: Result = {
					path: `${prefix.replace(/^\//, "")}`,
					content: {
						type: this.getType(nonObjectKeys),
						value: this.filterKeysFromObject(otherObject),
						revision: this.generateShortUUID(),
						revision_nr: 1,
						created: Date.now(),
						modified: Date.now(),
					},
				};

				if (nonObjectResult.path) {
					results.push(nonObjectResult);
				}
			} else {
				console.error("otherObject is not an object");
			}
		}

		// Se não há chaves não objeto, adiciona um resultado com objeto vazio
		if (Object.keys(nonObjectKeys).length === 0) {
			const nonObjectResult: Result = {
				path: `${prefix.replace(/^\//, "")}`,
				content: {
					type: this.getType({}),
					value: {} as any,
					revision: this.generateShortUUID(),
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

	private filterKeysFromObject(obj) {
		const checkIsValidDate = (string) => {
			// Expressão regular para validar o padrão da string de data
			const datePattern = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(\.\d{3})?([+-]\d{2}:\d{2})?Z?$/;

			if (datePattern.test(string)) {
				let date = new Date(string);
				return !isNaN(date.getTime());
			}

			return false;
		};

		const processObject = (inputObj) => {
			const filteredObject = {};

			for (const key in inputObj) {
				if (checkIsValidDate(inputObj[key])) {
					let newDate = new Date(inputObj[key]);
					filteredObject[key] = {
						type: 6,
						value: newDate.getTime(),
					};
				} else if (typeof inputObj[key] === "object" && inputObj[key] !== null) {
					// Recursively process nested objects
					filteredObject[key] = processObject(inputObj[key]);
				} else {
					// Copy other types of values as is
					filteredObject[key] = inputObj[key];
				}
			}

			return filteredObject;
		};

		return processObject(obj);
	}
	// Public method to initiate the transformation
	public startTransformation() {
		// Example usage:
		const instance = new ReadFiles("./test/outputResultWithPathJSON.json", FILE_ADDRESS_OUTPUT, FILE_ADDRESS_INPUT);
		instance.readPath();
	}
}

// Usage
const transformer = new NodeJsonTransformer();
transformer.startTransformation();
