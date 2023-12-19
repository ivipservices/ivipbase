import { MongoClient } from "mongodb";
import fs from "fs";
import path from "path";
const INPUT_FILE_NAME = "../../../../../test/myjsonfile.json";
// Class encapsulating the data restructuring functionality
export class NoderestructureJson {
    constructor(uri) {
        this.uri = uri;
        this.client = new MongoClient(uri);
    }
    // Establish a connection to the MongoDB database
    async connectToDatabase() {
        await this.client.connect();
    }
    // Close the connection to the MongoDB database
    async closeDatabaseConnection() {
        await this.client.close();
    }
    // Restructure JSON data based on specified logic
    restructureJson(entries) {
        let array_entries = entries;
        if (!Array.isArray(entries)) {
            array_entries = [entries];
        }
        function convertDates(obj) {
            // Verifica se o argumento é um objeto
            if (typeof obj === "object" && obj !== null) {
                // Percorre as chaves do objeto
                for (const key in obj) {
                    // Verifica se a chave é um objeto que atende à condição especificada
                    if (obj[key] && typeof obj[key] === "object" && obj[key].type === 6 && obj[key].value && typeof obj[key].value === "number") {
                        // Converte o valor da chave para uma string de data formatada
                        obj[key] = new Date(obj[key].value).toISOString();
                    }
                    else if (typeof obj[key] === "object") {
                        // Se a chave for um objeto, chama a função recursivamente para processar os subobjetos
                        convertDates(obj[key]);
                    }
                }
            }
            return obj;
        }
        const result = {};
        const KEY_THAT_MUST_BE_ARRAY = ["costs"];
        array_entries.forEach((entry) => {
            const { path, content } = entry;
            convertDates(entry);
            if (typeof path !== "string") {
                console.error("Invalid input: path should be a string");
                return;
            }
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
                        }
                        else {
                            current[key] = value;
                        }
                    }
                }
                else {
                    if (!current[part]) {
                        current[part] = {};
                    }
                    current = current[part];
                }
            }
        });
        return result;
    }
    // Fetch data from MongoDB collection
    async fetchDataFromMongoDB() {
        const collection = this.client.db("root").collection("teste");
        const limit = 50;
        // console.log(new Date().getSeconds(), "antes da busca");
        const resultData = await collection.find().toArray();
        const afterLimit = resultData.slice(0, limit);
        return afterLimit;
    }
    // Convert JSON data to string and save it to a file
    convertToJsonAndSaveToFile(dataWithOutPathFromMongodb) {
        // console.log(dataWithOutPathFromMongodb);
        const fileAddress = "./test/outputRestructuredJSON.json";
        fs.writeFile(fileAddress, dataWithOutPathFromMongodb, (error) => {
            if (error) {
                console.error("Algum erro aconteceu", error);
            }
            else {
                console.log(fileAddress);
            }
        });
        return dataWithOutPathFromMongodb;
    }
    async readFilesUsingPath(inputFile) {
        const filePath = path.join(`${process.platform === 'win32' ? '' : '/'}${/file:\/{2,3}(.+)\/[^/]/.exec(import.meta.url)[1]}`, inputFile);
        try {
            const data = fs.readFileSync(filePath, "utf8");
            const result = JSON.parse(data);
            return result;
        }
        catch (err) {
            console.error("Error reading or parsing the file:", err);
        }
    }
}
// // Usage
// const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
// const dataRestructure = new NoderestructureJson(uri);
// dataRestructure.main("REMOTE").catch(console.error);
//# sourceMappingURL=NodeRestructureJson.js.map