import { NoderestructureJson } from "../src/server/services/database/Node/NodeRestructureJson";

// SETTINGS

const uri = "mongodb://manager:9Hq91q5oExU9biOZ7yq98I8P1DU1ge@ivipcoin-api.com:4048/?authMechanism=DEFAULT";
const dataRestructure = new NoderestructureJson(uri);

export default { uri, dataRestructure };
