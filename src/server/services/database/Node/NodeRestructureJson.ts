import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";

import getJson from "./myjsonfile.json";

// Class encapsulating the data restructuring functionality
class NodeRestructureJson {
	public pathToSave: string;
	public jsonFile: any[];

	constructor(path: string, jsonFile: any[]) {
		this.pathToSave = path;
		this.jsonFile = jsonFile;
	}

	// Restructure JSON data based on specified logic
	private restructureJson(entries) {
		const result = {};
		const KEY_THAT_MUST_BE_ARRAY = ["costs"];
		entries?.forEach((entry) => {
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

	// Convert JSON data to string and save it to a file
	private convertToJsonAndSaveToFile(dataToSave) {
		const fileAddress: string = this.pathToSave;
		/*  fileAddress: file to save the data
		    dataWithOutPathFromMongodb: the data that will be save into of file 
		*/
		fs.writeFile(fileAddress, dataToSave, (error) => {
			if (error) {
				console.error("Algum erro aconteceu", error);
			} else {
				console.log(fileAddress);
			}
		});

		return dataToSave;
	}

	public async set() {
		try {
			/**
			 * the restructureJson: This function will receive the value from user,
			 * his parameter is refer to the value that user will pass
			 */
			const dataAfterToBeRestructured = this.restructureJson(this.jsonFile);
			/**
			 * the convertedToJson: After restructured the file from user, this variable will receive the
			 * value from restructureJson function, then we will pass into  convertToJsonAndSaveToFile
			 *
			 * convertToJsonAndSaveToFile: That is another function will his rules, the first is get the json file
			 * and save to address that the user will pass
			 *
			 */

			const convertedToJson = JSON.stringify(dataAfterToBeRestructured, null, 2);

			console.log(this.convertToJsonAndSaveToFile(convertedToJson));

			console.log(new Date().getSeconds(), "final da busca");
		} finally {
			console.log("LIDO COM SUCESSO");
		}
	}
}

// Usage
const OUTPUT_FILE_NAME = "./src/server/services/database/Node/outputRestructuredJSON.json";

const pathToSave = OUTPUT_FILE_NAME;
/*
here on jsonFile variable we will receive the 
json object from user, that his responsibility to pass it

*/
const jsonFile: any[] = getJson;
const dataRestructure = new NodeRestructureJson(pathToSave, jsonFile);
dataRestructure.set();
