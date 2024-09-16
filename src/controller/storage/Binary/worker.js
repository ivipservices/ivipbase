const { workerData, parentPort } = require("worker_threads");
const fs = require("fs");

const { filePath, start, end, index } = workerData;
