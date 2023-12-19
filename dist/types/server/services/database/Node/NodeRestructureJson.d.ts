/// <reference types="node" />
export declare class NoderestructureJson {
    private readonly uri;
    private readonly client;
    constructor(uri: string);
    private connectToDatabase;
    private closeDatabaseConnection;
    restructureJson(entries: any[] | Record<string, any>): {};
    private fetchDataFromMongoDB;
    convertToJsonAndSaveToFile(dataWithOutPathFromMongodb: string | NodeJS.ArrayBufferView): string | NodeJS.ArrayBufferView;
    private readFilesUsingPath;
}
//# sourceMappingURL=NodeRestructureJson.d.ts.map