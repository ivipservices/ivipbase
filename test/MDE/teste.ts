import MDE from "../../src/server/services/database/MDE";
import jsondata from "../myjsonfile.json";

const instance = new MDE({
	prefix: "",
	searchData: async (search) => {
		return jsondata.filter((node) => search.test(node.path)) as any;
	},
});

instance.get("ivipcoin-db::__movement_wallet__/007219693774253022", true);
// instance.get("ivipcoin-db::__movement_wallet__/000523147298669313/balances/", true).then(console.log);
