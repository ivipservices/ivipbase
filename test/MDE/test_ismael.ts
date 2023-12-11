import MDE from "../../src/server/services/database/MDE";
import JSONData from "../myjsonfile.json";

const main = new MDE({
	prefix: "",
	searchData(expression) {
		return JSONData.filter(({ path }) => expression.test(path)) as any[];
	},
	init() {
		this.pushNode([
			{
				path: "ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788",
				content: {
					type: 1,
					value: {
						currency_id: "test 02",
					},
					revision: "lnt02q7w000doohxasia0o3e",
					revision_nr: 1,
					created: 1697467086140,
					modified: Date.now(),
				},
			},
		]);

		this.getNodesBy("ivipcoin-db::__movement_wallet__/000523147298669313/history/1677138655788/currency_id").then((nodes) => {
			console.log(JSON.stringify(nodes, null, 4));
		});
	},
});
