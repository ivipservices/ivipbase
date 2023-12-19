"use strict";
var __createBinding = (this && this.__createBinding) || (Object.create ? (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    var desc = Object.getOwnPropertyDescriptor(m, k);
    if (!desc || ("get" in desc ? !m.__esModule : desc.writable || desc.configurable)) {
      desc = { enumerable: true, get: function() { return m[k]; } };
    }
    Object.defineProperty(o, k2, desc);
}) : (function(o, m, k, k2) {
    if (k2 === undefined) k2 = k;
    o[k2] = m[k];
}));
var __setModuleDefault = (this && this.__setModuleDefault) || (Object.create ? (function(o, v) {
    Object.defineProperty(o, "default", { enumerable: true, value: v });
}) : function(o, v) {
    o["default"] = v;
});
var __importStar = (this && this.__importStar) || function (mod) {
    if (mod && mod.__esModule) return mod;
    var result = {};
    if (mod != null) for (var k in mod) if (k !== "default" && Object.prototype.hasOwnProperty.call(mod, k)) __createBinding(result, mod, k);
    __setModuleDefault(result, mod);
    return result;
};
Object.defineProperty(exports, "__esModule", { value: true });
const fs = __importStar(require("fs"));
const path = __importStar(require("path"));
const crypto_1 = require("crypto");
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
};
class ReadFiles {
    constructor(fileAddress, outputResultPath, fileAddressParam) {
        this.fileAddress = fileAddress || "./test/outputResultWithPathJSON.json";
        this.outputResultPath = outputResultPath || FILE_ADDRESS_INPUT;
        this.fileAddressParam = fileAddressParam || FILE_ADDRESS_INPUT;
    }
    readPath() {
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
                const afterRestructureSaveIntoJSONFile = (dataWithOutPathFromMongodb) => {
                    console.log(new Date().getSeconds(), "started");
                    fs.writeFile(this.fileAddress, dataWithOutPathFromMongodb, (error) => {
                        if (error) {
                            console.error("Algum erro aconteceu", error);
                        }
                        else {
                            console.log(this.fileAddress);
                        }
                    });
                    return dataWithOutPathFromMongodb;
                };
                afterRestructureSaveIntoJSONFile(dataJSONModel);
            }
            catch (parseError) {
                console.error("Error parsing JSON:", parseError);
            }
        });
        console.log(new Date().getSeconds(), "end");
    }
}
class NodeJsonTransformer {
    generateShortUUID() {
        const fullUUID = (0, crypto_1.randomUUID)();
        const shortUUID = fullUUID.replace(/-/g, "").slice(0, 24);
        return shortUUID;
    }
    getType(value) {
        if (Array.isArray(value)) {
            return nodeValueTypes.ARRAY;
        }
        else if (value && typeof value === "object") {
            return nodeValueTypes.OBJECT;
        }
        else if (typeof value === "number") {
            return nodeValueTypes.NUMBER;
        }
        else if (typeof value === "boolean") {
            return nodeValueTypes.BOOLEAN;
        }
        else if (typeof value === "string") {
            return nodeValueTypes.STRING;
        }
        else if (typeof value === "bigint") {
            return nodeValueTypes.BIGINT;
        }
        else if (typeof value === "object" && value.type === 6) {
            return nodeValueTypes.DATETIME;
        }
        else {
            return nodeValueTypes.EMPTY;
        }
    }
    transform(json, prefix = "") {
        const results = [];
        const nonObjectKeys = {};
        const arrayResults = [];
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
                    results.push(...this.transform(currentValue[i], `${currentPath}[${i}]`));
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
            }
            else if (valueType === nodeValueTypes.OBJECT) {
                results.push(...this.transform(currentValue, currentPath));
            }
            else {
                nonObjectKeys[key] = currentValue;
                let ob = nonObjectKeys;
                otherObject = Object.entries(ob)
                    .filter(([key, value]) => typeof value !== "string" || value.length < 49)
                    .reduce((acc, [key, value]) => {
                    acc[key] = value;
                    return acc;
                }, {});
            }
        }
        // Adiciona um único resultado para chaves não objeto
        if (Object.keys(nonObjectKeys).length > 0) {
            if (typeof otherObject === "object" && otherObject !== null) {
                const nonObjectResult = {
                    path: `${prefix.replace(/^\//, "")}`,
                    content: {
                        type: this.getType(nonObjectKeys),
                        value: this.filterKeysFromObject(otherObject),
                        // value: otherObject,
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
            else {
                console.error("otherObject is not an object");
            }
        }
        // Se não há chaves não objeto, adiciona um resultado com objeto vazio
        if (Object.keys(nonObjectKeys).length === 0) {
            const nonObjectResult = {
                path: `${prefix.replace(/^\//, "")}`,
                content: {
                    type: this.getType({}),
                    value: {},
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
    filterKeysFromObject(obj) {
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
                }
                else if (typeof inputObj[key] === "object" && inputObj[key] !== null) {
                    // Recursively process nested objects
                    filteredObject[key] = processObject(inputObj[key]);
                }
                else {
                    // Copy other types of values as is
                    filteredObject[key] = inputObj[key];
                }
            }
            return filteredObject;
        };
        return processObject(obj);
    }
    // Public method to initiate the transformation
    startTransformation() {
        // Example usage:
        const instance = new ReadFiles("./test/outputResultWithPathJSON.json", FILE_ADDRESS_OUTPUT, FILE_ADDRESS_INPUT);
        instance.readPath();
    }
}
// Usage
const transformer = new NodeJsonTransformer();
transformer.startTransformation();
//# sourceMappingURL=NodeResultWithPath.js.map