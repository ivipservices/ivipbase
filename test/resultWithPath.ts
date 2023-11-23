import fs from "fs";
import path from "path";
import { randomUUID } from "crypto";

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

function transform(json: Record<string, unknown>, prefix: string = ""): Result[] {
	const results: Result[] = [];
	const nonObjectKeys: Record<string, unknown> = {};

	for (const key in json) {
		const currentPath = `${prefix.replace(/^\//, "")}/${key.replace(/\*\*/g, "")}`;
		const currentValue = json[key];

		if (key === "costs" && Array.isArray(currentValue) && currentValue.length > 0) {
			// If "costs" is an array with values, add [0] to the path
			results.push(...transform(currentValue[0] as Record<string, unknown>, `${currentPath}[0]`));
			console.log("entrou aqui", currentValue);
		} else if (key === "costs" && Array.isArray(currentValue) && currentValue.length === 0) {
			results.push(...transform(currentValue as unknown as Record<string, unknown>, `${currentPath}`));
		} else if (typeof currentValue === "object" && currentValue !== null) {
			// If not "costs" or is "costs" but not an array with values, proceed as usual
			results.push(...transform(currentValue as Record<string, unknown>, currentPath));
		} else {
			// If it's not an object, add to the nonObjectKeys
			nonObjectKeys[key] = currentValue;
		}
	}

	// Add a single result for non-object keys
	if (Object.keys(nonObjectKeys).length > 0) {
		const nonObjectResult: Result = {
			path: `${prefix.replace(/^\//, "")}`,
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

	if (Object.keys(nonObjectKeys).length === 0) {
		const nonObjectResult: Result = {
			path: `${prefix.replace(/^\//, "")}`,
			content: {
				type: 1,
				value: {} as any,
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
