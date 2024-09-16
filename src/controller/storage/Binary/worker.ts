import { workerData, parentPort } from "worker_threads";
import * as fs from "fs";
import type { WorkerData } from ".";

const { filePath, start, end, index } = workerData as WorkerData;
